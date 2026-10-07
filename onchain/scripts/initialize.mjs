// One-time setup of the deployed program: who operates it (submits results,
// co-signs stakes) and where fees go. Run in WSL with the upgrade authority:
//   node onchain/scripts/initialize.mjs <operator> <treasury> <usdc-mint> [rpc]
// Re-running it fails (the config account already exists); key changes go
// through update_config.
import fs from "node:fs";
import os from "node:os";
import { createRequire } from "node:module";

const require = createRequire(new URL("../../package.json", import.meta.url));
const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } =
  require("@solana/web3.js");

const idl = JSON.parse(fs.readFileSync(new URL("../idl/rivaly_rooms.json", import.meta.url), "utf8"));
const [operatorArg, treasuryArg, mintArg, rpc = "https://api.devnet.solana.com"] = process.argv.slice(2);
if (!operatorArg || !treasuryArg || !mintArg) throw new Error("usage: initialize.mjs <operator> <treasury> <usdc-mint> [rpc]");

const programId = new PublicKey(idl.address);
const admin = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf8"))));
const operator = new PublicKey(operatorArg);
const treasury = new PublicKey(treasuryArg);
const mint = new PublicKey(mintArg);
const loaderV3 = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
const [programData] = PublicKey.findProgramAddressSync([programId.toBuffer()], loaderV3);

const ix = idl.instructions.find((i) => i.name === "initialize");
const data = Buffer.concat([Buffer.from(ix.discriminator), operator.toBuffer(), treasury.toBuffer()]);
const keys = [
  { pubkey: admin.publicKey, isSigner: true, isWritable: true },
  { pubkey: config, isSigner: false, isWritable: true },
  { pubkey: mint, isSigner: false, isWritable: false },
  { pubkey: programId, isSigner: false, isWritable: false },
  { pubkey: programData, isSigner: false, isWritable: false },
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
];

const connection = new Connection(rpc, "confirmed");
const sig = await sendAndConfirmTransaction(connection, new Transaction().add(new TransactionInstruction({ programId, keys, data })), [admin]);
console.log("initialized:", sig);

// Read it back: discriminator(8) admin operator treasury mint (32 each) bump.
const acct = await connection.getAccountInfo(config);
const d = acct.data;
const at = (o) => new PublicKey(d.subarray(o, o + 32)).toBase58();
console.log({ config: config.toBase58(), owner: acct.owner.toBase58(), admin: at(8), operator: at(40), treasury: at(72), mint: at(104) });
