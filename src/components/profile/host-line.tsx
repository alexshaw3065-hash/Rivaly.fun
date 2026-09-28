"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMoneyCompact } from "@/lib/mock-data";

// The host line on a profile: how much money their rooms have held, and —
// only if they chose to show it, or it's you — what hosting has earned them.

interface Stats {
  rooms: number;
  pot: number;
  earnings: number | null;
}

export function HostLine({ profileId, isSelf }: { profileId: string; isSelf: boolean }) {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    let live = true;
    void createClient()
      .rpc("host_stats", { p_profile: profileId })
      .then(({ data }) => {
        const row = (Array.isArray(data) ? data[0] : data) as { rooms_hosted: number; pot_hosted_cents: number; earnings_cents: number | null } | null;
        if (live && row) setS({ rooms: row.rooms_hosted, pot: Number(row.pot_hosted_cents), earnings: row.earnings_cents === null ? null : Number(row.earnings_cents) });
      });
    return () => {
      live = false;
    };
  }, [profileId]);

  if (!s || s.rooms === 0 || s.pot === 0) return null;
  return <HostLineView pot={s.pot} earnings={s.earnings} isSelf={isSelf} />;
}

export function HostLineView({ pot, earnings, isSelf }: { pot: number; earnings: number | null; isSelf: boolean }) {
  const s = { pot, earnings };
  return (
    <p className="mt-2 text-body text-secondary">
      <span className="font-semibold text-foreground">{formatMoneyCompact(s.pot)}</span> staked in rooms {isSelf ? "you" : "they"} host
      {s.earnings !== null && s.earnings > 0 && (
        <>
          {" · "}
          <span className="font-semibold text-money-ink">{formatMoneyCompact(s.earnings)}</span> earned hosting
          {isSelf && <span className="text-caption"> (only you see this unless you show it in Settings)</span>}
        </>
      )}
    </p>
  );
}
