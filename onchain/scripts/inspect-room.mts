// Reads one program room straight off devnet with the app's own decoder:
// its rules, totals, positions and vault balance.
//   npx tsx --tsconfig tsconfig.json onchain/scripts/inspect-room.mts <room-uuid>
import fs from "node:fs";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const roomId = process.argv[2];
if (!roomId) throw new Error("usage: inspect-room.mts <room-uuid>");

const { Connection } = await import("@solana/web3.js");
const program = await import("@/lib/escrow/program");

const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
const room = program.roomPda(roomId);
const vault = program.vaultPda(room);
const chain = await program.readChainRoom(roomId);
const owners = await program.openPositionOwners(roomId);
let vaultCents = 0;
try {
  vaultCents = Number(BigInt((await connection.getTokenAccountBalance(vault)).value.amount) / BigInt(10_000));
} catch {}
console.log(JSON.stringify({
  room: room.toBase58(),
  vault: vault.toBase58(),
  vaultCents,
  chain: chain && { ...chain, lockAt: new Date(chain.lockTs * 1000).toISOString(), expiresAt: new Date(chain.expiryTs * 1000).toISOString(), dustOwner: chain.dustOwner?.toBase58() ?? null },
  openPositions: owners.map((o) => o.toBase58()),
}, null, 2));
