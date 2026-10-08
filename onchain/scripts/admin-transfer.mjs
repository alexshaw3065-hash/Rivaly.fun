// Handing the program's admin to someone else — in practice, a Squads
// multisig vault (docs/security/squads-handover.md). Two steps on-chain:
// the current admin proposes, the new admin accepts by signing.
//
// Run in WSL; `propose` and `cancel` sign with the current admin key
// (~/.config/solana/id.json):
//   node onchain/scripts/admin-transfer.mjs status [rpc]
//   node onchain/scripts/admin-transfer.mjs propose <new-admin> [rpc]
//   node onchain/scripts/admin-transfer.mjs cancel [rpc]
//   node onchain/scripts/admin-transfer.mjs accept-ix <new-admin> [rpc]
// `accept-ix` only prints the accept instruction, to add in Squads'
// transaction builder so the multisig signs it as the new admin.
import fs from "node:fs";
import os from "node:os";
import { createRequire } from "node:module";

const require = createRequire(new URL("../../package.json", import.meta.url));
const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } =
  require("@solana/web3.js");
const bs58 = require("bs58");

const idl = JSON.parse(fs.readFileSync(new URL("../idl/rivaly_rooms.json", import.meta.url), "utf8"));
const programId = new PublicKey(idl.address);
const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
const [transfer] = PublicKey.findProgramAddressSync([Buffer.from("admin_transfer")], programId);

const [cmd, ...rest] = process.argv.slice(2);
const needsTarget = cmd === "propose" || cmd === "accept-ix";
const target = needsTarget ? new PublicKey(rest[0] ?? "") : null;
const rpc = rest[needsTarget ? 1 : 0] ?? "https://api.devnet.solana.com";
const connection = new Connection(rpc, "confirmed");

const discriminator = (name) => {
  const ix = idl.instructions.find((i) => i.name === name);
  if (!ix) throw new Error(`${name} isn't in the IDL — rebuild (wsl-build.sh) and upgrade the program first`);
  return Buffer.from(ix.discriminator);
};
const adminKey = () => Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf8"))));
const ro = (pubkey, isSigner = false) => ({ pubkey, isSigner, isWritable: false });
const rw = (pubkey, isSigner = false) => ({ pubkey, isSigner, isWritable: true });

async function status() {
  const c = await connection.getAccountInfo(config);
  if (!c) throw new Error("config not found");
  const at = (d, o) => new PublicKey(d.subarray(o, o + 32)).toBase58();
  const t = await connection.getAccountInfo(transfer);
  console.log({
    program: programId.toBase58(),
    admin: at(c.data, 8),
    operator: at(c.data, 40),
    treasury: at(c.data, 72),
    pendingAdmin: t ? at(t.data, 8) : null,
    proposer: t ? at(t.data, 40) : null,
  });
}

async function send(ix, signer) {
  const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [signer]);
  console.log("sent:", sig);
}

if (cmd === "status") {
  await status();
} else if (cmd === "propose") {
  const admin = adminKey();
  const data = Buffer.concat([discriminator("propose_admin"), target.toBuffer()]);
  await send(new TransactionInstruction({ programId, data, keys: [rw(admin.publicKey, true), ro(config), rw(transfer), ro(SystemProgram.programId)] }), admin);
  await status();
} else if (cmd === "cancel") {
  const admin = adminKey();
  const t = await connection.getAccountInfo(transfer);
  if (!t) throw new Error("no proposal to cancel");
  const proposer = new PublicKey(t.data.subarray(40, 72));
  await send(new TransactionInstruction({ programId, data: discriminator("cancel_admin_transfer"), keys: [ro(admin.publicKey, true), ro(config), rw(transfer), rw(proposer)] }), admin);
  await status();
} else if (cmd === "accept-ix") {
  const t = await connection.getAccountInfo(transfer);
  if (!t) throw new Error("propose first: there's no pending admin");
  const pending = new PublicKey(t.data.subarray(8, 40));
  if (!pending.equals(target)) throw new Error(`the pending admin is ${pending.toBase58()}, not ${target.toBase58()}`);
  const proposer = new PublicKey(t.data.subarray(40, 72));
  console.log("Add this instruction in Squads (transaction builder), signed by the vault:");
  console.log(
    JSON.stringify(
      {
        programId: programId.toBase58(),
        accounts: [
          { pubkey: target.toBase58(), isSigner: true, isWritable: false, note: "new admin (the Squads vault)" },
          { pubkey: config.toBase58(), isSigner: false, isWritable: true, note: "config" },
          { pubkey: transfer.toBase58(), isSigner: false, isWritable: true, note: "admin_transfer" },
          { pubkey: proposer.toBase58(), isSigner: false, isWritable: true, note: "proposer (gets the rent back)" },
        ],
        dataHex: discriminator("accept_admin").toString("hex"),
        dataBase58: bs58.encode(discriminator("accept_admin")),
      },
      null,
      2,
    ),
  );
} else {
  console.log("usage: admin-transfer.mjs status|propose <new-admin>|cancel|accept-ix <new-admin> [rpc]");
}
