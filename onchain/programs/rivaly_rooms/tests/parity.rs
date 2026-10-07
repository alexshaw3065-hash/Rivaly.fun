//! Phase 5 parity: random rooms run start to finish on the program. For each
//! room this checks money is conserved to the unit, and writes what every
//! person actually received to a JSON file; onchain/scripts/parity-check.mjs
//! then compares it, entry by entry, with the app's own planSettlement
//! (src/lib/settlement/payouts.ts). Different code, same answer, or it fails.

mod common;
use common::*;
use solana_keypair::Keypair;
use solana_signer::Signer;
use std::fmt::Write as _;

/// A small deterministic generator, so a failure can be replayed.
struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
    fn below(&mut self, n: u64) -> u64 {
        self.next() % n
    }
}

const ROOMS: usize = 400;

#[test]
fn random_rooms_match_plan_settlement() {
    let mut rng = Rng(0x5eed_1234_abcd_0001);
    let mut json = String::from("[");

    for r in 0..ROOMS {
        let mut env = Env::new();
        let id = room_id((r % 250) as u8);
        let people = 1 + rng.below(12) as usize;
        let fee_bps = [0u16, 300, 2_500, rng.below(2_501) as u16][rng.below(4) as usize];
        let host_fee_bps = [0u16, 200, 2_500, rng.below(2_501) as u16][rng.below(4) as usize];

        // Stakes: sometimes everyone the same (ties), sometimes wide-ranging.
        let same = rng.below(4) == 0;
        let base = 100 + rng.below(5_000);
        let mut entries: Vec<(Keypair, u8, u64)> = Vec::new();
        for _ in 0..people {
            let amount = if same { base } else { 100 + rng.below(50_000) };
            let side = if rng.below(2) == 0 { YES } else { NO };
            let k = env.user(amount + 1_000);
            entries.push((k, side, amount));
        }
        for (k, side, amount) in &entries {
            let mut a = env.stake_args(id, *side, *amount);
            a.fee_bps = fee_bps;
            a.host_fee_bps = host_fee_bps;
            let ix = env.ix_stake(&k.pubkey(), &env.operator.pubkey(), a);
            let op = env.operator.insecure_clone();
            env.send(&[ix], &op, &[&op, k]).unwrap();
        }

        // The result: yes, no, a void, or a room left to expire.
        let pick = rng.below(10);
        let outcome: u8 = match pick {
            0 => 3,
            1 => 0, // expire
            n if n % 2 == 0 => YES,
            _ => NO,
        };
        if outcome == 0 {
            env.set_time(EXPIRY + 1);
            let op = env.operator.insecure_clone();
            env.send(&[env.ix_expire(&id)], &op, &[&op]).unwrap();
        } else {
            env.set_time(LOCK + 1);
            // The server names the largest winning stake, earliest on a tie.
            let dust = entries
                .iter()
                .filter(|(_, s, _)| *s == outcome)
                .fold(None::<&(Keypair, u8, u64)>, |best, e| match best {
                    Some(b) if e.2 <= b.2 => Some(b),
                    _ => Some(e),
                })
                .map(|e| e.0.pubkey());
            env.resolve(&id, outcome, dust.as_ref()).unwrap();
        }

        for (k, _, _) in &entries {
            env.payout(&id, &k.pubkey()).unwrap();
        }
        let room = env.room(&id);
        let dust_owner = if room.dust_owner == anchor_lang::prelude::Pubkey::default() { None } else { Some(room.dust_owner) };
        env.close_room(&id, dust_owner.as_ref()).unwrap();

        // What each person received, and conservation of every unit.
        let pool: u64 = entries.iter().map(|e| e.2).sum();
        let treasury = env.usdc_cents(&env.treasury.clone());
        let mut paid_total = 0;
        let mut rows = String::new();
        for (i, (k, side, amount)) in entries.iter().enumerate() {
            let received = env.usdc_cents(&k.pubkey()) - 1_000; // started with amount + 1000, staked amount
            paid_total += received;
            let _ = write!(
                rows,
                "{}{{\"id\":\"e{i}\",\"side\":\"{}\",\"amountCents\":{amount},\"received\":{received}}}",
                if i > 0 { "," } else { "" },
                if *side == YES { "yes" } else { "no" }
            );
        }
        assert_eq!(paid_total + treasury, pool, "room {r}: every cent accounted for");
        assert!(!env.exists(&room_pda(&env.program, &id)), "room {r} closed");

        let outcome_name = match outcome {
            YES => "yes",
            NO => "no",
            _ => "void",
        };
        let _ = write!(
            json,
            "{}{{\"room\":{r},\"outcome\":\"{outcome_name}\",\"rivalyBps\":{fee_bps},\"hostBps\":{host_fee_bps},\"fees\":{treasury},\"entries\":[{rows}]}}",
            if r > 0 { "," } else { "" }
        );
    }
    json.push(']');
    let out = std::env::var("PARITY_OUT").unwrap_or_else(|_| "/tmp/rivaly-parity.json".into());
    std::fs::write(&out, json).unwrap();
    println!("parity: {ROOMS} rooms written to {out}");
}
