"use client";

import { createClient } from "@/lib/supabase/client";

// Browser reads for the profile: the card's numbers and You vs them.

export interface CardNumbers {
  rating: number | null;
  tier: "gold" | "silver" | "bronze" | null;
  played: number;
  wins: number;
  losses: number;
  profit: number;
  streak: number;
  form: ("W" | "L")[];
}

export async function fetchCardNumbers(userId: string): Promise<CardNumbers | null> {
  const { data, error } = await createClient().rpc("player_card", { p_user: userId });
  if (error || !data) return null;
  const d = data as Partial<CardNumbers> & { profit?: number | string };
  return {
    rating: d.rating ?? null,
    tier: d.tier ?? null,
    played: d.played ?? 0,
    wins: d.wins ?? 0,
    losses: d.losses ?? 0,
    profit: Number(d.profit ?? 0),
    streak: d.streak ?? 0,
    form: d.form ?? [],
  };
}

export interface HeadToHead {
  mine: number;
  theirs: number;
  live: number;
  last: { roomId: string; prediction: string; mySide: "yes" | "no"; iWon: boolean; at: string | null; home: string | null; away: string | null } | null;
  rematchMatchId: string | null;
}

export async function fetchHeadToHead(otherId: string): Promise<HeadToHead | null> {
  const { data, error } = await createClient().rpc("head_to_head", { p_other: otherId });
  if (error || !data) return null;
  return data as HeadToHead;
}
