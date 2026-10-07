// Compares what the program actually paid in the parity test's random rooms
// (onchain/programs/rivaly_rooms/tests/parity.rs) with the app's own
// planSettlement, entry by entry. Node runs the TypeScript directly.
//   node onchain/scripts/parity-check.mjs /tmp/rivaly-parity.json
import fs from "node:fs";
import { planSettlement } from "../../src/lib/settlement/payouts.ts";

const rooms = JSON.parse(fs.readFileSync(process.argv[2] ?? "/tmp/rivaly-parity.json", "utf8"));
let entries = 0;
const failures = [];
for (const r of rooms) {
  const plan = planSettlement(
    r.entries.map((e) => ({ id: e.id, side: e.side, amountCents: e.amountCents })),
    r.outcome,
    { rivalyBps: r.rivalyBps, hostBps: r.hostBps },
  );
  for (const e of r.entries) {
    entries++;
    const want = plan.payouts.find((p) => p.entryId === e.id).cents;
    if (want !== e.received) failures.push(`room ${r.room} ${e.id}: program paid ${e.received}, planSettlement says ${want}`);
  }
  if (plan.rivalyCents + plan.hostCents !== r.fees) failures.push(`room ${r.room}: fees ${r.fees} vs planSettlement ${plan.rivalyCents + plan.hostCents}`);
}
const outcomes = rooms.reduce((m, r) => ({ ...m, [r.outcome]: (m[r.outcome] ?? 0) + 1 }), {});
console.log(`parity: ${rooms.length} rooms, ${entries} people, outcomes ${JSON.stringify(outcomes)}`);
if (failures.length) {
  console.log(`MISMATCHES (${failures.length}):\n` + failures.slice(0, 20).join("\n"));
  process.exit(1);
}
console.log("parity: every payout and every fee matches planSettlement to the cent");
