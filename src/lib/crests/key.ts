// Pure helpers for crest lookup and matching — shared by the client
// (TeamCrest reads the map by crestKey) and the sync job. Tested in
// key.test.ts.

/** The one lookup key for a team or league name: lower-case, accents stripped, spaces collapsed. */
export function crestKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Club-form noise that differs between feeds ("Sevilla FC" vs "Sevilla").
const NOISE = new Set(["fc", "cf", "sc", "afc", "ac", "as", "sk", "fk", "kv", "cd", "rc", "ss", "ssc", "us", "sv", "tsg", "vfb", "vfl", "rcd", "ud", "club", "de", "the", "calcio"]);

/** A looser form for comparing two names for the same club. */
export function looseKey(name: string): string {
  return crestKey(name)
    .replace(/^n\.y\.\s/, "new york ")
    .replace(/^l\.a\.\s/, "los angeles ")
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\butd\b/g, "united")
    .split(" ")
    .filter((w) => w && !NOISE.has(w))
    .join(" ");
}

// Feeds use short names; TheSportsDB's search only matches full names from
// the start. Known short forms → the name it files them under.
const ALIASES: Record<string, string> = {
  leeds: "Leeds United",
  ipswich: "Ipswich Town",
  brighton: "Brighton and Hove Albion",
  tottenham: "Tottenham Hotspur",
  newcastle: "Newcastle United",
  coventry: "Coventry City",
  "west ham": "West Ham United",
  wolves: "Wolverhampton Wanderers",
  leicester: "Leicester City",
  norwich: "Norwich City",
  charlotte: "Charlotte FC",
  dallas: "FC Dallas",
  montreal: "CF Montreal",
  "new england": "New England Revolution",
  "new york city": "New York City FC",
  "new york rb": "New York Red Bulls",
  "san diego": "San Diego FC",
  toronto: "Toronto FC",
  "st. louis city": "St. Louis City SC",
  "inter milan": "Inter",
  "fc cologne": "FC Koln",
  mainz: "Mainz 05",
  psv: "PSV Eindhoven",
  "pae aek": "AEK Athens",
  "athletic club": "Athletic Bilbao",
  "club brugge kv": "Club Brugge",
  "rc deportivo la coruna": "Deportivo La Coruna",
  "minnesota united fc": "Minnesota United",
  "congo dr": "DR Congo",
  alaves: "Deportivo Alaves",
  "st. louis city sc": "St. Louis City SC",
};

/** The fuller name TheSportsDB files this team under, if we know one. */
export function aliasFor(name: string): string | null {
  return ALIASES[crestKey(name)] ?? null;
}

/** What to type into a team search, best first. */
export function searchVariants(name: string): string[] {
  const out = [name];
  const alias = ALIASES[crestKey(name)];
  if (alias) out.unshift(alias);
  const expanded = name
    .replace(/^N\.Y\.\s/, "New York ")
    .replace(/^L\.A\.\s/, "Los Angeles ")
    .replace(/\bUtd\b/, "United");
  out.push(expanded);
  const bare = name.normalize("NFD").replace(/\p{M}/gu, "");
  out.push(bare);
  const stripped = looseKey(expanded);
  if (stripped) out.push(stripped);
  // A bare short name ("Hull") is usually filed with its suffix.
  if (!alias && name.trim().split(/\s+/).length <= 2) for (const suffix of [" United", " City", " Town", " FC"]) out.push(name.trim() + suffix);
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))];
}

export interface Candidate {
  id: string;
  name: string;
  alternates: string[];
  short: string | null;
  sport: string;
  gender: string | null;
  badge: string | null;
  /** Every competition TheSportsDB lists the team in. */
  leagues: string[];
}

const YOUTH = /\b(u\d{2}|women|woman|femenino|feminine|ladies|reserves|ii|b team)\b/i;

// Words a fuller club name may add without making it a different club.
const GENERIC = new Set(["united", "city", "town", "county"]);

/**
 * The candidate that is unmistakably this team, or null. A wrong crest is
 * worse than the monogram, so ambiguity is a miss, not a guess. TheSportsDB's
 * free search returns only its single top hit, which is often a namesake
 * (Newcastle → Newcastle Jets) or a club's B side, so:
 *   - a candidate whose own name is ours (or our known alias) is trusted;
 *   - one that matches only on an alternate name, or only partly ("Leeds" →
 *     "Leeds United"), must also play in one of our competitions for this
 *     team (`leagues`, TheSportsDB names). Without that (friendlies), a
 *     partial match may only add generic words (United, City, Town, County).
 */
export function pickCandidate(names: string | string[], sport: string, list: Candidate[], leagues: string[] | null = null): Candidate | null {
  const wants = [...new Set((Array.isArray(names) ? names : [names]).map(looseKey).filter(Boolean))];
  const wantYouth = (Array.isArray(names) ? names : [names]).some((n) => YOUTH.test(n));
  const pool = list.filter(
    (c) => c.badge && c.sport === sport && (c.gender == null || c.gender === "" || c.gender === "Male") && YOUTH.test(c.name) === wantYouth,
  );
  if (!pool.length || !wants.length) return null;
  const inLeague = (c: Candidate) => !leagues?.length || c.leagues.some((l) => leagues.includes(l));

  const primary = pool.filter((c) => wants.includes(looseKey(c.name)));
  if (primary.length === 1) return primary[0];
  if (primary.length > 1) return null;

  const alternate = pool.filter((c) => c.alternates.map(looseKey).some((a) => wants.includes(a)) && leagues?.length && inLeague(c));
  if (alternate.length === 1) return alternate[0];
  if (alternate.length > 1) return null;

  const close = pool.filter((c) =>
    [c.name, ...c.alternates].map(looseKey).some((n) => {
      const theirs = n.split(" ");
      return wants.some((want) => {
        const ours = want.split(" ");
        if (!ours.every((w) => theirs.includes(w))) return false;
        return leagues?.length ? inLeague(c) : theirs.every((w) => ours.includes(w) || GENERIC.has(w));
      });
    }),
  );
  return close.length === 1 ? close[0] : null;
}
