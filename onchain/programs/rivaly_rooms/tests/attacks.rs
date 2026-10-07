//! Phase 5 attacks and edge cases beyond single refusals: money pushed into
//! a vault from outside, strangers driving the payouts, a big room, rent
//! coming back, and the refund-then-recover path.

mod common;
use anchor_spl::token::spl_token;
use common::*;
use solana_keypair::Keypair;
use solana_signer::Signer;

/// Sends USDC straight into a room's vault, outside the program.
fn donate(env: &mut Env, id: &[u8; 16], cents: u64) {
    let donor = env.user(cents);
    env.svm.airdrop(&donor.pubkey(), 1_000_000_000).unwrap();
    let from = anchor_spl::associated_token::get_associated_token_address(&donor.pubkey(), &env.mint);
    let room = room_pda(&env.program, id);
    let to = vault_pda(&env.program, &room);
    let ix = spl_token::instruction::transfer_checked(&spl_token::ID, &from, &env.mint, &to, &donor.pubkey(), &[], cents * UNITS, 6).unwrap();
    env.send(&[ix], &donor, &[&donor]).unwrap();
}

#[test]
fn money_pushed_into_a_vault_doesnt_break_or_bend_the_payouts() {
    let mut env = Env::new();
    let id = room_id(1);
    let alice = env.user(10_000);
    let bob = env.user(10_000);
    env.stake(id, &alice, YES, 1_000);
    env.stake(id, &bob, NO, 1_000);
    donate(&mut env, &id, 777);
    env.set_time(LOCK + 1);
    let (a, b) = (alice.pubkey(), bob.pubkey());
    env.resolve(&id, YES, Some(&a)).unwrap();
    env.payout(&id, &a).unwrap();
    env.payout(&id, &b).unwrap();
    // Payouts follow the recorded stakes, not the vault balance…
    assert_eq!(env.usdc_cents(&a), 9_000 + 1_950);
    // …and the room still closes: the extra goes to the named winner.
    env.close_room(&id, Some(&a)).unwrap();
    assert_eq!(env.usdc_cents(&a), 9_000 + 1_950 + 777);
    assert_eq!(env.usdc_cents(&env.treasury.clone()), 50);
}

#[test]
fn money_pushed_into_a_refunded_room_goes_to_the_treasury_not_stuck() {
    let mut env = Env::new();
    let id = room_id(1);
    let alice = env.user(10_000);
    env.stake(id, &alice, YES, 1_000);
    donate(&mut env, &id, 5);
    env.resolve(&id, 3, None).unwrap();
    let a = alice.pubkey();
    env.payout(&id, &a).unwrap();
    assert_eq!(env.usdc_cents(&a), 10_000);
    env.close_room(&id, None).unwrap();
    assert_eq!(env.usdc_cents(&env.treasury.clone()), 5);
}

#[test]
fn strangers_can_drive_every_step_after_expiry_and_everyone_is_refunded() {
    // Rivaly disappears after kick-off: nobody resolves the room.
    let mut env = Env::new();
    let id = room_id(1);
    let people: Vec<Keypair> = (0..5).map(|_| env.user(5_000)).collect();
    for (i, p) in people.iter().enumerate() {
        env.stake(id, p, if i % 2 == 0 { YES } else { NO }, 1_000 + i as u64 * 100);
    }
    env.set_time(EXPIRY + 60);
    let stranger = Keypair::new();
    env.svm.airdrop(&stranger.pubkey(), 2_000_000_000).unwrap();
    env.send(&[env.ix_expire(&id)], &stranger, &[&stranger]).unwrap();
    for p in &people {
        let ix = env.ix_payout(&id, &stranger.pubkey(), &p.pubkey());
        env.send(&[ix], &stranger, &[&stranger]).unwrap();
    }
    for p in &people {
        assert_eq!(env.usdc_cents(&p.pubkey()), 5_000, "full refund");
    }
    let ix = env.ix_close_room(&id, None);
    env.send(&[ix], &stranger, &[&stranger]).unwrap();
    assert!(!env.exists(&room_pda(&env.program, &id)));
}

#[test]
fn a_big_room_pays_everyone_and_conserves_every_cent() {
    let mut env = Env::new();
    let id = room_id(1);
    let people: Vec<(Keypair, u8, u64)> = (0..60)
        .map(|i| (env.user(100_000), if i % 3 == 0 { NO } else { YES }, 100 + (i as u64 * 7_919) % 90_000))
        .collect();
    for (k, side, cents) in &people {
        env.stake(id, k, *side, *cents);
    }
    env.set_time(LOCK + 1);
    let largest = people.iter().filter(|p| p.1 == NO).fold(None::<&(Keypair, u8, u64)>, |b, e| match b {
        Some(x) if e.2 <= x.2 => Some(x),
        _ => Some(e),
    });
    let dust = largest.unwrap().0.pubkey();
    env.resolve(&id, NO, Some(&dust)).unwrap();
    for (k, _, _) in &people {
        env.payout(&id, &k.pubkey()).unwrap();
    }
    env.close_room(&id, Some(&dust)).unwrap();
    let total: u64 = people.iter().map(|p| env.usdc_cents(&p.0.pubkey())).sum::<u64>() + env.usdc_cents(&env.treasury.clone());
    assert_eq!(total, 60 * 100_000);
    for (k, side, _) in &people {
        if *side == YES {
            assert!(env.usdc_cents(&k.pubkey()) < 100_000, "losers don't get money back");
        }
    }
}

#[test]
fn rent_comes_back_to_the_operator() {
    let mut env = Env::new();
    let op = env.operator.pubkey();
    let start = env.svm.get_balance(&op).unwrap();
    let id = room_id(1);
    let alice = env.user(10_000);
    let bob = env.user(10_000);
    env.stake(id, &alice, YES, 1_000);
    env.stake(id, &bob, NO, 1_000);
    let mid = env.svm.get_balance(&op).unwrap();
    assert!(start - mid > 3_000_000, "the operator fronted the rent");
    env.set_time(LOCK + 1);
    let (a, b) = (alice.pubkey(), bob.pubkey());
    env.resolve(&id, YES, Some(&a)).unwrap();
    env.payout(&id, &a).unwrap();
    env.payout(&id, &b).unwrap();
    env.close_room(&id, Some(&a)).unwrap();
    let end = env.svm.get_balance(&op).unwrap();
    // Only network fees spent: two stakes with two signatures each (10_000),
    // then resolve, two payouts and close with one (5_000). All rent is back.
    assert_eq!(start - end, 2 * 10_000 + 4 * 5_000);
}

#[test]
fn a_refunded_stake_can_be_placed_again_and_the_room_still_settles() {
    let mut env = Env::new();
    let id = room_id(1);
    let alice = env.user(10_000);
    let bob = env.user(10_000);
    env.stake(id, &alice, YES, 1_000);
    env.stake(id, &bob, NO, 1_000);
    let op = env.operator.insecure_clone();
    let a = alice.pubkey();
    env.send(&[env.ix_refund_position(&id, &op.pubkey(), &a)], &op, &[&op]).unwrap();
    env.stake(id, &alice, YES, 2_000);
    let room = env.room(&id);
    assert_eq!((room.yes_cents, room.no_cents, room.positions), (2_000, 1_000, 2));
    env.set_time(LOCK + 1);
    env.resolve(&id, YES, Some(&a)).unwrap();
    env.payout(&id, &a).unwrap();
    env.payout(&id, &bob.pubkey()).unwrap();
    env.close_room(&id, Some(&a)).unwrap();
    // Pool 3000, profit 1000, fees 50: Alice gets 2950 back on her 2000.
    assert_eq!(env.usdc_cents(&a), 8_000 + 2_950);
}

#[test]
fn an_empty_room_can_be_voided_and_closed() {
    // The recovery path: a room's only stake refunded, then cleaned up.
    let mut env = Env::new();
    let id = room_id(1);
    let alice = env.user(10_000);
    env.stake(id, &alice, YES, 1_000);
    let op = env.operator.insecure_clone();
    let a = alice.pubkey();
    env.send(&[env.ix_refund_position(&id, &op.pubkey(), &a)], &op, &[&op]).unwrap();
    env.resolve(&id, 3, None).unwrap();
    env.close_room(&id, None).unwrap();
    assert_eq!(env.usdc_cents(&a), 10_000);
    assert!(!env.exists(&room_pda(&env.program, &id)));
}

#[test]
fn payouts_batched_five_to_a_transaction_fit() {
    // The app sends up to five payouts per transaction (PROGRAM_PAYOUTS_PER_TX).
    let mut env = Env::new();
    let id = room_id(1);
    let people: Vec<Keypair> = (0..5).map(|_| env.user(10_000)).collect();
    for (i, p) in people.iter().enumerate() {
        env.stake(id, p, if i == 0 { NO } else { YES }, 1_000);
    }
    env.set_time(LOCK + 1);
    let w = people[1].pubkey();
    env.resolve(&id, YES, Some(&w)).unwrap();
    let op = env.operator.insecure_clone();
    let cu = solana_compute_budget_interface::ComputeBudgetInstruction::set_compute_unit_limit(400_000);
    let mut ixs = vec![cu];
    ixs.extend(people.iter().map(|p| env.ix_payout(&id, &op.pubkey(), &p.pubkey())));
    env.send(&ixs, &op, &[&op]).unwrap();
    assert_eq!(env.room(&id).paid, 5);
}

#[test]
fn the_same_position_twice_in_one_transaction_pays_once() {
    let mut env = Env::new();
    let id = room_id(1);
    let alice = env.user(10_000);
    let bob = env.user(10_000);
    env.stake(id, &alice, YES, 1_000);
    env.stake(id, &bob, NO, 1_000);
    env.set_time(LOCK + 1);
    let a = alice.pubkey();
    env.resolve(&id, YES, Some(&a)).unwrap();
    let op = env.operator.insecure_clone();
    let ix = env.ix_payout(&id, &op.pubkey(), &a);
    // The whole transaction fails: the second payout finds the position closed.
    assert!(env.send(&[ix.clone(), ix], &op, &[&op]).is_err());
    assert_eq!(env.usdc_cents(&a), 9_000, "nothing paid");
    env.payout(&id, &a).unwrap();
    assert_eq!(env.usdc_cents(&a), 9_000 + 1_950, "paid exactly once");
}

#[test]
fn a_position_from_another_room_cant_be_paid_from_this_one() {
    let mut env = Env::new();
    let (id1, id2) = (room_id(1), room_id(2));
    let alice = env.user(10_000);
    let bob = env.user(10_000);
    let carol = env.user(10_000);
    env.stake(id1, &alice, YES, 1_000);
    env.stake(id1, &bob, NO, 1_000);
    env.stake(id2, &carol, YES, 1_000);
    env.set_time(LOCK + 1);
    let a = alice.pubkey();
    env.resolve(&id1, YES, Some(&a)).unwrap();
    // Carol's room-2 position named in a room-1 payout.
    let op = env.operator.insecure_clone();
    let mut ix = env.ix_payout(&id1, &op.pubkey(), &carol.pubkey());
    let room2 = room_pda(&env.program, &id2);
    ix.accounts[5].pubkey = position_pda(&env.program, &room2, &carol.pubkey());
    assert!(env.send(&[ix], &op, &[&op]).is_err());
    assert_eq!(env.vault_units(&id1), 2_000 * UNITS);
}
