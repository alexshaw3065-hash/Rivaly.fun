//! Phase 1 smoke run: one room, start to finish, with fees on.
//! The full test and attack suite is Phase 5 (docs/plans/onchain-escrow.md).

mod common;
use common::*;
use solana_signer::Signer;

#[test]
fn one_room_start_to_finish() {
    let mut env = Env::new();
    let id = room_id(1);
    let alice = env.user(5_000); // $50
    let bob = env.user(5_000);
    let carol = env.user(5_000);

    // Stakes: Alice $10 YES, Carol $5 YES, Bob $20 NO. Pool $35.
    env.stake(id, &alice, YES, 1_000);
    env.stake(id, &carol, YES, 500);
    env.stake(id, &bob, NO, 2_000);
    assert_eq!(env.vault_units(&id), 3_500 * UNITS);
    let room = env.room(&id);
    assert_eq!((room.yes_cents, room.no_cents, room.positions), (1_500, 2_000, 3));
    assert_eq!(env.usdc_cents(&alice.pubkey()), 4_000);

    // Kick-off passes; YES wins. Alice has the largest winning stake.
    env.set_time(LOCK + 60);
    let a = alice.pubkey();
    env.resolve(&id, YES, Some(&a)).unwrap();

    // planSettlement: profit 2000; Rivaly 3% = 60, host 2% = 40;
    // distributable 3400 over 1500 → Alice floor(1000*3400/1500)=2266,
    // Carol floor(500*3400/1500)=1133, leftover 1 cent to Alice.
    let room = env.room(&id);
    assert_eq!((room.rivaly_fee_cents, room.host_fee_cents, room.distributable_cents), (60, 40, 3_400));

    for who in [alice.pubkey(), bob.pubkey(), carol.pubkey()] {
        env.payout(&id, &who).unwrap();
    }
    assert_eq!(env.usdc_cents(&alice.pubkey()), 4_000 + 2_266);
    assert_eq!(env.usdc_cents(&carol.pubkey()), 4_500 + 1_133);
    assert_eq!(env.usdc_cents(&bob.pubkey()), 3_000);

    let treasury = env.treasury;
    env.close_room(&id, Some(&a)).unwrap();
    assert_eq!(env.usdc_cents(&alice.pubkey()), 4_000 + 2_267, "leftover cent to the largest winner");
    assert_eq!(env.usdc_cents(&treasury), 100, "Rivaly + host fees to the treasury");

    // Everything accounted for: 3 users started with $150 total.
    let total = env.usdc_cents(&alice.pubkey()) + env.usdc_cents(&bob.pubkey()) + env.usdc_cents(&carol.pubkey()) + env.usdc_cents(&treasury);
    assert_eq!(total, 15_000);
    // Room, vault and positions closed, rent back to the operator.
    assert!(!env.exists(&room_pda(&env.program, &id)));
    assert!(env.position(&id, &alice.pubkey()).is_none());
}
