// Shared by the server loader (map.ts) and the client provider — kept apart
// so the client bundle never pulls in next/cache or supabase-js for a type.

export interface CrestMap {
  base: string;
  team: Record<string, string>;
  league: Record<string, string>;
}

export const EMPTY_CRESTS: CrestMap = { base: "", team: {}, league: {} };
