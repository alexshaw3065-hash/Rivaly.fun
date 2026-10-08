//! Phase 5: everything the program must refuse. Each test sets up a valid
//! situation, then tries one wrong thing and checks it fails for the right
//! reason (and that nothing moved).

mod common;
use common::*;
use anchor_lang::prelude::Pubkey;
use solana_keypair::Keypair;
use solana_signer::Signer;

fn assert_err(res: Result<(), String>, name: &str) {
    match res {
        Ok(()) => panic!("expected failure {name}, but it succeeded"),
        Err(logs) => assert!(logs.contains(name), "expected {name}, got:\n{logs}"),
    }
}

/// A room with Alice YES $10 and Bob NO $10, before kick-off.
fn two_sided(env: &mut Env, n: u8) -> ([u8; 16], Keypair, Keypair) {
    let id = room_id(n);
    let alice = env.user(10_000);
    let bob = env.user(10_000);
    env.stake(id, &alice, YES, 1_000);
    env.stake(id, &bob, NO, 1_000);
    (id, alice, bob)
}

// ── setup ──────────────────────────────────────────────────────────────

#[test]
fn initialize_only_by_the_upgrade_authority_and_only_once() {
    let mut env = Env::new_uninitialised();
    let stranger = Keypair::new();
    env.svm.airdrop(&stranger.pubkey(), 1_000_000_000).unwrap();
    let (op, mint) = (env.operator.pubkey(), env.mint);
    let ix = env.ix_initialize(&stranger.pubkey(), op, op, mint);
    assert_err(env.send(&[ix], &stranger, &[&stranger]), "Unauthorized");

    let admin = env.admin.insecure_clone();
    env.send(&[env.ix_initialize(&admin.pubkey(), op, op, mint)], &admin, &[&admin]).unwrap();
    // Again: the config account already exists.
    assert!(env.send(&[env.ix_initialize(&admin.pubkey(), op, op, mint)], &admin, &[&admin]).is_err());
}

#[test]
fn initialize_refuses_a_mint_that_isnt_6_decimals() {
    let mut env = Env::new_uninitialised();
    let fake = Pubkey::new_unique();
    env.put_mint(&fake, 9);
    let admin = env.admin.insecure_clone();
    let op = env.operator.pubkey();
    assert_err(env.send(&[env.ix_initialize(&admin.pubkey(), op, op, fake)], &admin, &[&admin]), "WrongMint");
}

#[test]
fn update_config_only_by_admin_and_the_new_operator_takes_over() {
    let mut env = Env::new();
    let stranger = Keypair::new();
    env.svm.airdrop(&stranger.pubkey(), 1_000_000_000).unwrap();
    let ix = env.ix_update_config(&stranger.pubkey(), stranger.pubkey(), stranger.pubkey());
    assert_err(env.send(&[ix], &stranger, &[&stranger]), "Unauthorized");

    // Rotate the operator: the old one can no longer co-sign stakes.
    let new_op = Keypair::new();
    env.svm.airdrop(&new_op.pubkey(), 10_000_000_000).unwrap();
    let admin = env.admin.insecure_clone();
    let t = env.treasury;
    env.send(&[env.ix_update_config(&admin.pubkey(), new_op.pubkey(), t)], &admin, &[&admin]).unwrap();
    let alice = env.user(5_000);
    let old = env.operator.insecure_clone();
    let ix = env.ix_stake(&alice.pubkey(), &old.pubkey(), env.stake_args(room_id(1), YES, 500));
    assert_err(env.send(&[ix], &old, &[&old, &alice]), "Unauthorized");
    let ix = env.ix_stake(&alice.pubkey(), &new_op.pubkey(), env.stake_args(room_id(1), YES, 500));
    env.send(&[ix], &new_op, &[&new_op, &alice]).unwrap();
}

// ── stake ──────────────────────────────────────────────────────────────

#[test]
fn stake_needs_the_operator() {
    let mut env = Env::new();
    let alice = env.user(5_000);
    let fake_op = Keypair::new();
    env.svm.airdrop(&fake_op.pubkey(), 10_000_000_000).unwrap();
    let ix = env.ix_stake(&alice.pubkey(), &fake_op.pubkey(), env.stake_args(room_id(1), YES, 500));
    assert_err(env.send(&[ix], &fake_op, &[&fake_op, &alice]), "Unauthorized");
    assert_eq!(env.usdc_cents(&alice.pubkey()), 5_000);
}

#[test]
fn stake_needs_the_user_signature() {
    let mut env = Env::new();
    let alice = env.user(5_000);
    let op = env.operator.insecure_clone();
    let mut ix = env.ix_stake(&alice.pubkey(), &op.pubkey(), env.stake_args(room_id(1), YES, 500));
    ix.accounts[0].is_signer = false; // pretend the user didn't sign
    assert!(env.send(&[ix], &op, &[&op]).is_err());
    assert_eq!(env.usdc_cents(&alice.pubkey()), 5_000);
}

#[test]
fn stake_closes_at_kickoff() {
    let mut env = Env::new();
    let (id, _, _) = two_sided(&mut env, 1);
    let carol = env.user(5_000);
    env.set_time(LOCK); // exactly kick-off: closed
    let op = env.operator.insecure_clone();
    let ix = env.ix_stake(&carol.pubkey(), &op.pubkey(), env.stake_args(id, YES, 500));
    assert_err(env.send(&[ix], &op, &[&op, &carol]), "StakesClosed");
    env.set_time(LOCK - 1); // a second before: open
    env.stake(id, &carol, YES, 500);
}

#[test]
fn stake_once_per_person_per_room() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    let op = env.operator.insecure_clone();
    let ix = env.ix_stake(&alice.pubkey(), &op.pubkey(), env.stake_args(id, NO, 500));
    assert!(env.send(&[ix], &op, &[&op, &alice]).is_err());
    assert_eq!(env.room(&id).positions, 2);
}

#[test]
fn stake_side_and_amount_limits() {
    let mut env = Env::new();
    let alice = env.user(200_000_000);
    let op = env.operator.insecure_clone();
    for (side, cents, err) in [(0u8, 500u64, "BadSide"), (3, 500, "BadSide"), (YES, 99, "BadAmount"), (YES, 100_000_001, "BadAmount")] {
        let ix = env.ix_stake(&alice.pubkey(), &op.pubkey(), env.stake_args(room_id(1), side, cents));
        assert_err(env.send(&[ix], &op, &[&op, &alice]), err);
    }
    // The floor itself is allowed.
    env.stake(room_id(1), &alice, YES, 100);
}

#[test]
fn opening_a_room_checks_its_rules() {
    let mut env = Env::new();
    let alice = env.user(5_000);
    let op = env.operator.insecure_clone();
    let mut a = env.stake_args(room_id(1), YES, 500);
    a.fee_bps = 2_501;
    assert_err(env.send(&[env.ix_stake(&alice.pubkey(), &op.pubkey(), a)], &op, &[&op, &alice]), "FeeTooHigh");
    let mut a = env.stake_args(room_id(1), YES, 500);
    a.host_fee_bps = 9_000;
    assert_err(env.send(&[env.ix_stake(&alice.pubkey(), &op.pubkey(), a)], &op, &[&op, &alice]), "FeeTooHigh");
    let mut a = env.stake_args(room_id(1), YES, 500);
    a.lock_ts = T0 - 1; // stakes already closed
    assert_err(env.send(&[env.ix_stake(&alice.pubkey(), &op.pubkey(), a)], &op, &[&op, &alice]), "BadTimes");
    let mut a = env.stake_args(room_id(1), YES, 500);
    a.expiry_ts = a.lock_ts; // expiry must come after the lock
    assert_err(env.send(&[env.ix_stake(&alice.pubkey(), &op.pubkey(), a)], &op, &[&op, &alice]), "BadTimes");
}

#[test]
fn fees_together_are_capped_at_6_percent() {
    let mut env = Env::new();
    let alice = env.user(50_000);
    let op = env.operator.insecure_clone();
    // 4% + 2.01%: over the ceiling, whichever way it's split.
    for (n, rivaly, host) in [(1u8, 400u16, 201u16), (2, 601, 0), (3, 0, 601)] {
        let mut a = env.stake_args(room_id(n), YES, 500);
        a.fee_bps = rivaly;
        a.host_fee_bps = host;
        assert_err(env.send(&[env.ix_stake(&alice.pubkey(), &op.pubkey(), a)], &op, &[&op, &alice]), "FeeTooHigh");
    }
    // Exactly 6% is allowed.
    let mut a = env.stake_args(room_id(4), YES, 500);
    a.fee_bps = 400;
    a.host_fee_bps = 200;
    env.send(&[env.ix_stake(&alice.pubkey(), &op.pubkey(), a)], &op, &[&op, &alice]).unwrap();
}

#[test]
fn a_room_cant_hold_stakes_indefinitely() {
    let mut env = Env::new();
    let alice = env.user(50_000);
    let op = env.operator.insecure_clone();
    const DAY: i64 = 86_400;
    // Stakes may close at most 180 days ahead…
    let mut a = env.stake_args(room_id(1), YES, 500);
    a.lock_ts = T0 + 180 * DAY + 1;
    a.expiry_ts = a.lock_ts + DAY;
    assert_err(env.send(&[env.ix_stake(&alice.pubkey(), &op.pubkey(), a)], &op, &[&op, &alice]), "BadTimes");
    // …and the room must expire at most 21 days after that.
    let mut a = env.stake_args(room_id(2), YES, 500);
    a.expiry_ts = a.lock_ts + 21 * DAY + 1;
    assert_err(env.send(&[env.ix_stake(&alice.pubkey(), &op.pubkey(), a)], &op, &[&op, &alice]), "BadTimes");
    // Both limits exactly: allowed.
    let mut a = env.stake_args(room_id(3), YES, 500);
    a.lock_ts = T0 + 180 * DAY;
    a.expiry_ts = a.lock_ts + 21 * DAY;
    env.send(&[env.ix_stake(&alice.pubkey(), &op.pubkey(), a)], &op, &[&op, &alice]).unwrap();
}

// ── admin hand-over ───────────────────────────────────────────────────

#[test]
fn admin_changes_hands_only_when_the_new_admin_accepts() {
    let mut env = Env::new();
    let admin = env.admin.insecure_clone();
    let next = Keypair::new();
    let stranger = Keypair::new();
    for k in [&next, &stranger] {
        env.svm.airdrop(&k.pubkey(), 1_000_000_000).unwrap();
    }

    // Only the admin can propose.
    let ix = env.ix_propose_admin(&stranger.pubkey(), stranger.pubkey());
    assert_err(env.send(&[ix], &stranger, &[&stranger]), "Unauthorized");

    env.send(&[env.ix_propose_admin(&admin.pubkey(), next.pubkey())], &admin, &[&admin]).unwrap();
    // Proposing changes nothing yet.
    assert_eq!(env.config().admin, admin.pubkey());

    // Only the named key can accept.
    let ix = env.ix_accept_admin(&stranger.pubkey(), &admin.pubkey());
    assert_err(env.send(&[ix], &stranger, &[&stranger]), "Unauthorized");

    env.send(&[env.ix_accept_admin(&next.pubkey(), &admin.pubkey())], &next, &[&next]).unwrap();
    assert_eq!(env.config().admin, next.pubkey());
    assert!(!env.exists(&admin_transfer_pda(&env.program)), "the proposal is closed");

    // The old admin is out; the new one can rotate keys.
    let (op, t) = (env.operator.pubkey(), env.treasury);
    assert_err(env.send(&[env.ix_update_config(&admin.pubkey(), op, t)], &admin, &[&admin]), "Unauthorized");
    env.send(&[env.ix_update_config(&next.pubkey(), op, t)], &next, &[&next]).unwrap();
}

#[test]
fn a_cancelled_proposal_cant_be_accepted() {
    let mut env = Env::new();
    let admin = env.admin.insecure_clone();
    let next = Keypair::new();
    env.svm.airdrop(&next.pubkey(), 1_000_000_000).unwrap();
    env.send(&[env.ix_propose_admin(&admin.pubkey(), next.pubkey())], &admin, &[&admin]).unwrap();

    // Only the admin can cancel.
    let ix = env.ix_cancel_admin_transfer(&next.pubkey(), &admin.pubkey());
    assert_err(env.send(&[ix], &next, &[&next]), "Unauthorized");
    env.send(&[env.ix_cancel_admin_transfer(&admin.pubkey(), &admin.pubkey())], &admin, &[&admin]).unwrap();

    assert!(env.send(&[env.ix_accept_admin(&next.pubkey(), &admin.pubkey())], &next, &[&next]).is_err());
    assert_eq!(env.config().admin, admin.pubkey());
}

#[test]
fn later_stakes_cant_change_a_rooms_rules() {
    let mut env = Env::new();
    let (id, _, _) = two_sided(&mut env, 1);
    let carol = env.user(5_000);
    let op = env.operator.insecure_clone();
    let mut a = env.stake_args(id, YES, 500);
    a.fee_bps = 0;
    a.host_fee_bps = 2_500;
    a.lock_ts = EXPIRY - 1;
    env.send(&[env.ix_stake(&carol.pubkey(), &op.pubkey(), a)], &op, &[&op, &carol]).unwrap();
    let room = env.room(&id);
    assert_eq!((room.fee_bps, room.host_fee_bps, room.lock_ts), (300, 200, LOCK), "first stake's rules stay frozen");
}

#[test]
fn stake_only_from_the_users_own_usdc() {
    let mut env = Env::new();
    let alice = env.user(5_000);
    let victim = env.user(5_000);
    let op = env.operator.insecure_clone();
    // Alice signs but names the victim's token account as the source.
    let victim_ata = anchor_spl::associated_token::get_associated_token_address(&victim.pubkey(), &env.mint);
    let room = room_pda(&env.program, &room_id(1));
    let ix = env.ix_stake_with(&alice.pubkey(), &op.pubkey(), env.stake_args(room_id(1), YES, 500), victim_ata, room);
    assert!(env.send(&[ix], &op, &[&op, &alice]).is_err());
    assert_eq!(env.usdc_cents(&victim.pubkey()), 5_000);
}

#[test]
fn stake_only_in_real_usdc() {
    let mut env = Env::new();
    let alice = env.user(5_000);
    let fake_mint = Pubkey::new_unique();
    env.put_mint(&fake_mint, 6);
    let fake_ata = env.put_token_account_of(&alice.pubkey(), &fake_mint, 5_000);
    let op = env.operator.insecure_clone();
    let room = room_pda(&env.program, &room_id(1));
    let ix = env.ix_stake_with(&alice.pubkey(), &op.pubkey(), env.stake_args(room_id(1), YES, 500), fake_ata, room);
    assert!(env.send(&[ix], &op, &[&op, &alice]).is_err());
}

#[test]
fn stake_into_a_room_account_that_isnt_its_own() {
    let mut env = Env::new();
    two_sided(&mut env, 1);
    let alice = env.user(5_000);
    let op = env.operator.insecure_clone();
    // Arguments name room 2, accounts point at room 1.
    let room1 = room_pda(&env.program, &room_id(1));
    let ata = anchor_spl::associated_token::get_associated_token_address(&alice.pubkey(), &env.mint);
    let ix = env.ix_stake_with(&alice.pubkey(), &op.pubkey(), env.stake_args(room_id(2), YES, 500), ata, room1);
    assert!(env.send(&[ix], &op, &[&op, &alice]).is_err());
}

// ── resolve ────────────────────────────────────────────────────────────

#[test]
fn resolve_only_by_the_operator() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    env.set_time(LOCK + 1);
    let stranger = Keypair::new();
    env.svm.airdrop(&stranger.pubkey(), 1_000_000_000).unwrap();
    let ix = env.ix_resolve(&id, &stranger.pubkey(), YES, Some(&alice.pubkey()));
    assert_err(env.send(&[ix], &stranger, &[&stranger]), "Unauthorized");
    assert_eq!(env.room(&id).outcome, 0);
}

#[test]
fn a_result_only_after_kickoff_but_void_any_time() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    let a = alice.pubkey();
    assert_err(env.resolve(&id, YES, Some(&a)), "TooEarly");
    env.resolve(&id, 3, None).unwrap(); // void before kick-off: a postponed match
    assert!(env.room(&id).refund_all);
}

#[test]
fn resolve_once() {
    let mut env = Env::new();
    let (id, alice, bob) = two_sided(&mut env, 1);
    env.set_time(LOCK + 1);
    let (a, b) = (alice.pubkey(), bob.pubkey());
    env.resolve(&id, YES, Some(&a)).unwrap();
    assert_err(env.resolve(&id, NO, Some(&b)), "AlreadyResolved");
    assert_err(env.resolve(&id, 3, None), "AlreadyResolved");
}

#[test]
fn resolve_rejects_a_bad_outcome() {
    let mut env = Env::new();
    let (id, _, _) = two_sided(&mut env, 1);
    env.set_time(LOCK + 1);
    assert_err(env.resolve(&id, 0, None), "BadOutcome");
    assert_err(env.resolve(&id, 4, None), "BadOutcome");
}

#[test]
fn resolve_after_expiry_is_refused() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    env.set_time(EXPIRY);
    let a = alice.pubkey();
    assert_err(env.resolve(&id, YES, Some(&a)), "Expired");
}

#[test]
fn the_leftover_winner_must_be_a_winner_in_this_room() {
    let mut env = Env::new();
    let (id, alice, bob) = two_sided(&mut env, 1);
    let (_, other_alice, _) = two_sided(&mut env, 2);
    env.set_time(LOCK + 1);
    let (a, b, oa) = (alice.pubkey(), bob.pubkey(), other_alice.pubkey());
    assert_err(env.resolve(&id, YES, None), "DustPositionRequired");
    assert_err(env.resolve(&id, YES, Some(&b)), "DustNotWinner");
    // Room 2's position passed for room 1.
    let mut ix = env.ix_resolve(&id, &env.operator.pubkey(), YES, Some(&a));
    let room2 = room_pda(&env.program, &room_id(2));
    ix.accounts[3].pubkey = position_pda(&env.program, &room2, &oa);
    let op = env.operator.insecure_clone();
    assert_err(env.send(&[ix], &op, &[&op]), "WrongRoom");
    env.resolve(&id, YES, Some(&a)).unwrap();
}

// ── expire ─────────────────────────────────────────────────────────────

#[test]
fn expire_only_after_expiry_and_only_if_unresolved() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    let anyone = Keypair::new();
    env.svm.airdrop(&anyone.pubkey(), 1_000_000_000).unwrap();
    env.set_time(EXPIRY - 1);
    assert_err(env.send(&[env.ix_expire(&id)], &anyone, &[&anyone]), "NotExpired");
    env.set_time(EXPIRY);
    env.send(&[env.ix_expire(&id)], &anyone, &[&anyone]).unwrap();
    let room = env.room(&id);
    assert!(room.refund_all && room.outcome == 3);
    // Already void: can't expire again, can't resolve.
    assert_err(env.send(&[env.ix_expire(&id)], &anyone, &[&anyone]), "AlreadyResolved");
    let a = alice.pubkey();
    assert!(env.resolve(&id, YES, Some(&a)).is_err());
}

// ── payout ─────────────────────────────────────────────────────────────

#[test]
fn payout_only_after_a_result() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    let a = alice.pubkey();
    assert_err(env.payout(&id, &a), "NotResolved");
}

#[test]
fn payout_once() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    env.set_time(LOCK + 1);
    let a = alice.pubkey();
    env.resolve(&id, YES, Some(&a)).unwrap();
    env.payout(&id, &a).unwrap();
    let after = env.usdc_cents(&a);
    assert!(env.payout(&id, &a).is_err());
    assert_eq!(env.usdc_cents(&a), after);
}

#[test]
fn payout_goes_only_to_the_positions_owner() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    env.set_time(LOCK + 1);
    let a = alice.pubkey();
    env.resolve(&id, YES, Some(&a)).unwrap();
    let thief = Keypair::new();
    env.svm.airdrop(&thief.pubkey(), 1_000_000_000).unwrap();
    env.put_token_account(&thief.pubkey(), 0);

    // Alice's position, the thief named as owner.
    let mut ix = env.ix_payout(&id, &thief.pubkey(), &thief.pubkey());
    let room = room_pda(&env.program, &id);
    ix.accounts[5].pubkey = position_pda(&env.program, &room, &a);
    assert!(env.send(&[ix], &thief, &[&thief]).is_err());

    // Alice as owner, the thief's USDC account as the destination.
    let mut ix = env.ix_payout(&id, &thief.pubkey(), &a);
    ix.accounts[7].pubkey = anchor_spl::associated_token::get_associated_token_address(&thief.pubkey(), &env.mint);
    assert!(env.send(&[ix], &thief, &[&thief]).is_err());

    // The thief keeping the position's rent.
    let mut ix = env.ix_payout(&id, &thief.pubkey(), &a);
    ix.accounts[8].pubkey = thief.pubkey();
    assert_err(env.send(&[ix], &thief, &[&thief]), "WrongRentPayer");
    assert_eq!(env.usdc_cents(&thief.pubkey()), 0);

    // Anyone may send the real payout — it still goes to Alice.
    let before = env.usdc_cents(&a);
    let ix = env.ix_payout(&id, &thief.pubkey(), &a);
    env.send(&[ix], &thief, &[&thief]).unwrap();
    // Pool 2000, profit 1000, fees 3% + 2% of it = 50: Alice gets 1950.
    assert_eq!(env.usdc_cents(&a), before + 1_950);
    assert_eq!(env.usdc_cents(&thief.pubkey()), 0);
}

#[test]
fn payout_cant_use_another_rooms_vault() {
    let mut env = Env::new();
    let (id1, alice, _) = two_sided(&mut env, 1);
    two_sided(&mut env, 2);
    env.set_time(LOCK + 1);
    let a = alice.pubkey();
    env.resolve(&id1, YES, Some(&a)).unwrap();
    let mut ix = env.ix_payout(&id1, &env.operator.pubkey(), &a);
    let room2 = room_pda(&env.program, &room_id(2));
    ix.accounts[4].pubkey = vault_pda(&env.program, &room2);
    let op = env.operator.insecure_clone();
    assert!(env.send(&[ix], &op, &[&op]).is_err());
    assert_eq!(env.vault_units(&room_id(2)), 2_000 * UNITS);
}

#[test]
fn payout_refuses_a_substitute_token_program() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    env.set_time(LOCK + 1);
    let a = alice.pubkey();
    env.resolve(&id, YES, Some(&a)).unwrap();
    let mut ix = env.ix_payout(&id, &env.operator.pubkey(), &a);
    ix.accounts[9].pubkey = anchor_spl::token_2022::ID;
    let op = env.operator.insecure_clone();
    assert!(env.send(&[ix], &op, &[&op]).is_err());
}

// ── refund_position ────────────────────────────────────────────────────

#[test]
fn refund_position_only_by_the_operator_and_only_before_a_result() {
    let mut env = Env::new();
    let (id, alice, bob) = two_sided(&mut env, 1);
    let thief = Keypair::new();
    env.svm.airdrop(&thief.pubkey(), 1_000_000_000).unwrap();
    let a = alice.pubkey();
    let ix = env.ix_refund_position(&id, &thief.pubkey(), &a);
    assert_err(env.send(&[ix], &thief, &[&thief]), "Unauthorized");

    let op = env.operator.insecure_clone();
    env.send(&[env.ix_refund_position(&id, &op.pubkey(), &a)], &op, &[&op]).unwrap();
    assert_eq!(env.usdc_cents(&a), 10_000);
    let room = env.room(&id);
    assert_eq!((room.yes_cents, room.positions), (0, 1));

    env.set_time(LOCK + 1);
    let b = bob.pubkey();
    env.resolve(&id, NO, Some(&b)).unwrap();
    assert_err(env.send(&[env.ix_refund_position(&id, &op.pubkey(), &b)], &op, &[&op]), "AlreadyResolved");
}

// ── close_room ─────────────────────────────────────────────────────────

#[test]
fn close_only_after_everyone_is_paid() {
    let mut env = Env::new();
    let (id, alice, _) = two_sided(&mut env, 1);
    assert_err(env.close_room(&id, None), "NotResolved");
    env.set_time(LOCK + 1);
    let a = alice.pubkey();
    env.resolve(&id, YES, Some(&a)).unwrap();
    env.payout(&id, &a).unwrap();
    assert_err(env.close_room(&id, Some(&a)), "NotAllPaid");
}

#[test]
fn close_must_pay_the_leftover_to_the_named_winner() {
    let mut env = Env::new();
    // Three equal YES stakes against one NO: 1 cent of rounding is left over.
    let id = room_id(1);
    let ys: Vec<Keypair> = (0..3).map(|_| env.user(10_000)).collect();
    let n = env.user(10_000);
    for y in &ys {
        env.stake(id, y, YES, 1_000);
    }
    env.stake(id, &n, NO, 1_000);
    env.set_time(LOCK + 1);
    let first = ys[0].pubkey();
    env.resolve(&id, YES, Some(&first)).unwrap();
    for who in ys.iter().map(|k| k.pubkey()).chain([n.pubkey()]) {
        env.payout(&id, &who).unwrap();
    }
    assert!(env.vault_units(&id) > 0);
    // No leftover account, or someone else's, is refused.
    assert_err(env.close_room(&id, None), "DustAccountRequired");
    let other = ys[1].pubkey();
    assert!(env.close_room(&id, Some(&other)).is_err());
    env.close_room(&id, Some(&first)).unwrap();
}

#[test]
fn close_refuses_a_fake_treasury() {
    let mut env = Env::new();
    let (id, alice, bob) = two_sided(&mut env, 1);
    env.set_time(LOCK + 1);
    let (a, b) = (alice.pubkey(), bob.pubkey());
    env.resolve(&id, YES, Some(&a)).unwrap();
    env.payout(&id, &a).unwrap();
    env.payout(&id, &b).unwrap();
    let mut ix = env.ix_close_room(&id, Some(&a));
    ix.accounts[4].pubkey = anchor_spl::associated_token::get_associated_token_address(&b, &env.mint);
    let op = env.operator.insecure_clone();
    assert!(env.send(&[ix], &op, &[&op]).is_err());
}
