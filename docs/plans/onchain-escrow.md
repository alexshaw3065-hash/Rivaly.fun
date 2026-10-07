# On-chain escrow: a Solana program that holds each room's stakes

Founder go-ahead 2026-10-07. Built in phases, each finished and checked before the next starts. Testing and breaking it is its own long phase (Phase 5), not something squeezed in at the end.

## Why

Today every stake sits in one Rivaly-held wallet whose key is on the server. Whoever has that key can send everything anywhere. With the program, each room's money sits in its own vault that only the program's rules can move:

- money leaves a room's vault only to the people who staked in it (winnings or refunds), and, once everyone is paid, the room's fees to Rivaly's treasury;
- the split is computed on-chain with the same arithmetic as `planSettlement` (pro rata; fees are a cut of the winners' profit only, frozen when the room opens);
- if a room isn't resolved by its expiry, anyone can void it and everyone gets their stake back.

**What it does not change:** Rivaly's operator key still says who won (yes / no / void), from official match data off-chain. It can't take the money, but it could call a room wrongly. Never say "trustless". The program's upgrade authority is another trust point: it moves to a two-signature key before mainnet.

## The switch

Admin → Settings → **On-chain escrow** (a `feature_flags` row): off / admins only / everyone. It decides the custody of **new rooms only**: each room records `custody = 'wallet' | 'program'` when created, and every stake, payout and refund for that room follows its own custody until it closes. Turning the switch off sends new rooms back to the wallet; program rooms already open still finish on the program. Once the program has run cleanly for long enough, the wallet path for rooms is deleted. The escrow wallet stays as the fee payer (gasless staking), the operator key and the fee treasury.

## Program design (`onchain/programs/rivaly_rooms`)

Amounts are whole cents, as the app stores them (1 cent = 10,000 USDC units), so on-chain and off-chain splits agree to the cent.

| Account | Seeds | Holds |
|---|---|---|
| Config | `config` | admin, operator, treasury, USDC mint |
| Room | `room`, room uuid | frozen fee rates, stake lock time, expiry, yes/no totals, outcome, frozen split |
| Vault | `vault`, room | the room's USDC (owned by the room) |
| Position | `position`, room, user | one user's side and stake (one per user per room, as today) |

| Instruction | Who | Does |
|---|---|---|
| `initialize` | upgrade authority, once | sets operator, treasury, mint |
| `update_config` | admin | rotates operator / treasury |
| `stake` | user + operator (fee payer) | first stake opens the room with its frozen rules; USDC user → vault; only before the lock time |
| `resolve` | operator | yes / no / void, before expiry; a result only after the lock time (void any time); freezes fees and names the winner who takes the rounding leftover |
| `expire` | anyone | past expiry and unresolved → void, full refunds |
| `payout` | anyone | pays one position its winnings / refund / nothing, only to its owner; closes the position so it can't be paid twice |
| `refund_position` | operator, before a result | sends one stake back to its owner (stake landed but the app couldn't record it) |
| `close_room` | anyone, after every position is paid | fees → treasury, rounding leftover → named winner, closes the vault and room, rent back to Rivaly |

Fees go to the treasury (the escrow wallet's USDC account), where host claims and admin withdrawals already work — that flow doesn't change.

## Phases

| Phase | What | Done when |
|---|---|---|
| **0. Tools and keys** | WSL (Ubuntu), Rust, Solana tools, Anchor. Devnet deploy key (upgrade authority) on this laptop only, never committed; funded with devnet SOL. | An empty program builds and deploys to devnet |
| **1. The program** | Write it; a smoke run of one room on a local validator. No app changes. | Builds cleanly, IDL generated, smoke run passes |
| **2. Devnet deploy** | Deploy; `initialize` with operator = treasury = escrow wallet; program id into `.env.example` and constants. | Config readable on devnet with the right keys |
| **3. App wiring, switch off** | `rooms.custody`, the flag, room ids chosen before the room is written; `src/lib/escrow/program.ts`; staking, settlement (on-chain state is the record of who's paid), stake recovery, reconciliation, wallet history, admin switch and vault view. Wallet rooms untouched. | Typecheck, lint, all tests pass with the switch off; live app behaves exactly as before |
| **4. Admins-only mode** | Only admin accounts' new rooms use the program. | An admin can open and stake in a program room |
| **5. Testing and breaking it (long)** | See below. Every bug fixed with a test that would have caught it. | All pass, and two matchdays of test rooms settle correctly on devnet |
| **6. Turn it on** | Switch on for everyone; watch vaults vs the database. Rollback = switch off. | — |
| **Later** | Retire the wallet path for rooms; professional audit; two-signature upgrade key or frozen; mainnet. | |

### Phase 5 in full
- **Refusals:** wrong signer, wrong room, wrong owner, wrong mint, fake vault; paying twice, paying before a result; resolving twice, early or after expiry; expiring early; staking after the lock or twice; closing before everyone is paid; fee above the cap; amounts at the limits.
- **Parity:** thousands of random rooms; the program's payouts equal `planSettlement` to the cent, and winners + fees = pool exactly.
- **Attacks:** another room's vault or position, substituted token accounts, a fake config, re-initialising, front-running the first stake with different rules, donating USDC to a vault, overflow.
- **App on devnet (admins-only mode):** win, lose, void, one-sided, expiry; a stake that lands but can't be recorded; the settle job running twice at once; an RPC failure mid-payout; many winners (batched payouts); fees on and off; a host claim afterwards.
- **Regression:** wallet-custody rooms settle exactly as before.

## Honest limits

- Our own tests and attack runs are not an audit. Never call it "audited" until a firm has.
- The operator still decides results; the program only limits where money can go.
- Rent for each room and position (a little SOL) is paid by Rivaly and returned when they close.
