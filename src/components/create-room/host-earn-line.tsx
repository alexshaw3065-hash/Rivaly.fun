import { pct } from "@/lib/fees";

/** Create Room, stake step: what hosting this room earns. Shown only while fees are on. */
export function HostEarnLine({ hostBps }: { hostBps: number }) {
  return (
    <p className="-mt-3 text-caption text-secondary">
      You host this room: you earn <span className="font-semibold text-foreground">{pct(hostBps)} of the winnings</span> when it settles,
      whichever side wins.
    </p>
  );
}
