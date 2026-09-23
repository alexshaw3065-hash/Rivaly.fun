# Fast deposit → create room

Goal: a new visitor goes from "I have an opinion" to a live room in under 30 seconds, with one sign-in.

Decisions (founder, 2026-09-23):

| Question | Decision |
| --- | --- |
| Where the money is | **The user's own Dynamic embedded Solana wallet.** Its devnet USDC *is* the balance. No separate Rivaly balance. |
| How people get funds (devnet) | The top-bar wallet shows the address + QR; they take devnet USDC from the faucet (faucet.circle.com). |
| When to sign in | **Only at "Throw down".** Build the room signed-out; the draft survives sign-in and the room is created on return. |
| Where a stake goes | **An escrow wallet** — but not wired yet (see *Escrow, next phase*). |
| Mock data | Mock rooms + packs removed. Mock profiles/leaderboards stay for now. |

## The path today

```
Pick match → call → room rules → stake → [Throw down]
                                              │ signed out
                                              ▼
                                  Google / email (Dynamic)
                                              │ draft kept in sessionStorage
                                              ▼
                        back on the stake step, draft restored
                                              │ wallet short?
                                              ▼
                     [Add USDC] (address + QR) / devnet faucet
                                              ▼
                              room created automatically / on tap
```

## What happens at a stake, right now

- **No USDC moves yet.** The server reads the wallet's devnet USDC on-chain, subtracts stakes already open in unfinished rooms, and only writes the entry if the stake fits. That stops the same $10 backing ten rooms.
- This is a **guard, not a security boundary**: until escrow exists the money isn't locked. It becomes a boundary the moment each stake is a verified on-chain transfer.
- `create_room_with_stake` / `join_room_with_stake` (Postgres) write the room + entry atomically; direct inserts into `rooms` / `entries` are closed.

## Escrow, next phase

Recommended shape, in order of when it's worth doing:

1. **Devnet: one escrow wallet, key in a managed signer.** Each create/join sends the stake from the user's embedded wallet to the escrow's USDC account (one signature, ~1–2 s on devnet). The server verifies the transaction on-chain *before* the entry exists: finalized/confirmed, USDC mint, exact amount, source = the user's own wallet, destination = escrow, signature never used before (stored with a unique constraint, so a replay can't create a second entry). Settlement pays winners from escrow. The key lives in a managed signer (Turnkey, Dynamic server wallets, or a KMS) — never in client code or a plain env var.
2. **Gasless stakes.** Rivaly pays the network fee as fee payer, so users never need SOL — USDC only.
3. **Mainnet: on-chain escrow program (per-room vault).** Funds sit in a program-owned account that can only release by the program's rules, settled from TxLINE's on-chain stat validation (`market_side_definition` already mirrors TxLINE's predicate shape for exactly this). No single key can move pooled money — the "Trust must be visible" end state. Needs an audit before real money.

Operational musts at any stage: a reconciliation job (escrow balance vs. open stakes), per-user rate limits on create/join, and a treasury multisig (e.g. Squads) for anything swept out of escrow.

Needs from the founder before step 1: the escrow wallet's **public address**, and the choice of signer that will hold its key.
