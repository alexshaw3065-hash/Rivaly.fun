# Moving the program's keys to Squads

Today one key on one laptop (WSL `~/.config/solana/id.json`, `28JBTpya…VTXS`) is both the program's **upgrade authority** (it can replace the program's code) and its **config admin** (it can swap the operator and the treasury). Either power alone is enough to redirect money. This runbook moves both to a Squads multisig, so no single device can do either.

Order matters: the admin first (it needs the program upgrade that adds the hand-over), then the upgrade authority last — once that moves, upgrades also need the multisig.

## 0. Before you start

- The program upgrade with `propose_admin` / `accept_admin` is deployed (`wsl-build.sh test`, then `wsl-deploy.sh`).
- Decide the members and threshold. Recommended: **2 of 3** — e.g. the founder's hardware wallet, a second device kept elsewhere, and a co-founder or trusted adviser. Never two keys on the same machine.
- Create the multisig at [app.squads.so](https://app.squads.so) (devnet first: switch the network in settings). Note its **vault address** (vault index 0). That address is what becomes the admin and the upgrade authority.

## 1. The admin (two steps)

```bash
# in WSL, from the repo
node onchain/scripts/admin-transfer.mjs status
node onchain/scripts/admin-transfer.mjs propose <SQUADS_VAULT>
node onchain/scripts/admin-transfer.mjs accept-ix <SQUADS_VAULT>
```

`accept-ix` prints the accept instruction (program, four accounts, data). In Squads, create a transaction with that instruction (the transaction builder), have the members approve it, and execute. Then:

```bash
node onchain/scripts/admin-transfer.mjs status   # admin = the vault, no pending admin
```

Nothing changes until the vault signs, so a typo in the proposed address can't lock anyone out: propose again, or `cancel`.

## 2. The upgrade authority

```bash
solana program set-upgrade-authority FwPoC3NgmMVwoHk7QUGGotmx7dbsSNF5E6N7enxx7kLF \
  --new-upgrade-authority <SQUADS_VAULT> --skip-new-upgrade-authority-signer-check -u devnet
solana program show FwPoC3NgmMVwoHk7QUGGotmx7dbsSNF5E6N7enxx7kLF -u devnet   # Authority: the vault
```

From then on, upgrades go through Squads' program-upgrade flow (upload the buffer with `solana program write-buffer`, set the buffer authority to the vault, propose the upgrade in Squads). `wsl-deploy.sh` will no longer work by itself — that's the point.

## 3. Afterwards

- Rotate the operator/treasury, when needed, through a Squads transaction calling `update_config`.
- Retire the laptop key for anything but devnet experiments.
- Mainnet: deploy fresh, initialise with the multisig, and never let a single key hold either role.

## Still open

The **escrow wallet** is still the operator (decides results, co-signs stakes), the fee payer and the treasury — see the audit (docs/security/audit-2026-10-07.md). Splitting the treasury off needs a product call first: hosts' earnings are paid out of the treasury, so a multisig treasury would mean a multisig approval for every host claim. The clean fix is for the program to pay each room's host fee straight to the host at settlement (no claim step) — the founder's decision, since it changes "claim your earnings" into "earnings arrive automatically".
