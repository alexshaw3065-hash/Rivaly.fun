// Team colours and short codes for the generated crests. TxLINE supplies
// names only — no logos — so rather than hotlink trademarked badges from a
// third-party CDN, each team gets a monogram crest in its real kit colours.
// Curated for the teams that actually appear in the fixture list (NFL, the
// Premier League, MLS, the national sides in Friendlies); anything else falls back to a
// stable colour derived from the name, so every team still reads as itself
// and never as a grey placeholder.

export interface TeamIdentity {
  code: string;
  primary: string;
  secondary: string;
  /** Text colour that reads on `primary`. */
  ink: string;
}

type Entry = [code: string, primary: string, secondary: string];

// NFL, keyed by nickname — unique across the league and immune to the
// feed's "N.Y." / "L.A." city abbreviations.
const NFL: Record<string, Entry> = {
  cardinals: ["ARI", "#97233F", "#FFFFFF"],
  falcons: ["ATL", "#A71930", "#101820"],
  ravens: ["BAL", "#241773", "#9E7C0C"],
  bills: ["BUF", "#00338D", "#C60C30"],
  panthers: ["CAR", "#0085CA", "#101820"],
  bears: ["CHI", "#0B162A", "#C83803"],
  bengals: ["CIN", "#FB4F14", "#101820"],
  browns: ["CLE", "#311D00", "#FF3C00"],
  cowboys: ["DAL", "#003594", "#869397"],
  broncos: ["DEN", "#FB4F14", "#002244"],
  lions: ["DET", "#0076B6", "#B0B7BC"],
  packers: ["GB", "#203731", "#FFB612"],
  texans: ["HOU", "#03202F", "#A71930"],
  colts: ["IND", "#002C5F", "#A2AAAD"],
  jaguars: ["JAX", "#006778", "#D7A22A"],
  chiefs: ["KC", "#E31837", "#FFB81C"],
  raiders: ["LV", "#101010", "#A5ACAF"],
  chargers: ["LAC", "#0080C6", "#FFC20E"],
  rams: ["LAR", "#003594", "#FFA300"],
  dolphins: ["MIA", "#008E97", "#FC4C02"],
  vikings: ["MIN", "#4F2683", "#FFC62F"],
  patriots: ["NE", "#002244", "#C60C30"],
  saints: ["NO", "#D3BC8D", "#101820"],
  giants: ["NYG", "#0B2265", "#A71930"],
  jets: ["NYJ", "#125740", "#FFFFFF"],
  eagles: ["PHI", "#004C54", "#A5ACAF"],
  steelers: ["PIT", "#FFB612", "#101820"],
  "49ers": ["SF", "#AA0000", "#B3995D"],
  seahawks: ["SEA", "#002244", "#69BE28"],
  buccaneers: ["TB", "#D50A0A", "#34302B"],
  titans: ["TEN", "#0C2340", "#4B92DB"],
  commanders: ["WAS", "#5A1414", "#FFB612"],
};

// Clubs and national sides, keyed by lower-cased full name.
const TEAMS: Record<string, Entry> = {
  // Premier League — keyed by the feed's own names ("Manchester Utd", "Leeds")
  arsenal: ["ARS", "#EF0107", "#FFFFFF"],
  "aston villa": ["AVL", "#670E36", "#95BFE5"],
  bournemouth: ["BOU", "#DA291C", "#101010"],
  brentford: ["BRE", "#E30613", "#FFFFFF"],
  brighton: ["BHA", "#0057B8", "#FFFFFF"],
  chelsea: ["CHE", "#034694", "#FFFFFF"],
  coventry: ["COV", "#7BC2E9", "#101010"],
  "crystal palace": ["CRY", "#1B458F", "#C4122E"],
  everton: ["EVE", "#003399", "#FFFFFF"],
  fulham: ["FUL", "#F5F5F5", "#101010"],
  "hull city": ["HUL", "#F5A12D", "#101010"],
  ipswich: ["IPS", "#0033A0", "#FFFFFF"],
  leeds: ["LEE", "#F5F5F5", "#1D428A"],
  liverpool: ["LIV", "#C8102E", "#F6EB61"],
  "manchester city": ["MCI", "#6CABDD", "#1C2C5B"],
  "manchester utd": ["MUN", "#DA291C", "#FBE122"],
  newcastle: ["NEW", "#241F20", "#F5F5F5"],
  "nottingham forest": ["NFO", "#DD0000", "#FFFFFF"],
  sunderland: ["SUN", "#EB172B", "#101010"],
  tottenham: ["TOT", "#F5F5F5", "#132257"],
  // MLS
  "atlanta united": ["ATL", "#80000A", "#A19060"],
  "austin fc": ["ATX", "#00B140", "#101010"],
  charlotte: ["CLT", "#1A85C8", "#101010"],
  "chicago fire": ["CHI", "#C8102E", "#7CCDEF"],
  "columbus crew": ["CLB", "#FEDD00", "#101010"],
  dallas: ["DAL", "#BF0D3E", "#002D72"],
  "houston dynamo": ["HOU", "#FF6B00", "#101820"],
  "la galaxy": ["LAG", "#00245D", "#FFD200"],
  lafc: ["LAFC", "#101010", "#C39E6D"],
  montreal: ["MTL", "#0033A1", "#101010"],
  "nashville sc": ["NSH", "#ECE83A", "#1F1646"],
  "new york rb": ["NYRB", "#ED1E36", "#23326A"],
  "philadelphia union": ["PHI", "#071B2C", "#B38707"],
  "real salt lake": ["RSL", "#B30838", "#013A81"],
  "san jose earthquakes": ["SJ", "#0067B1", "#101010"],
  "seattle sounders": ["SEA", "#5D9741", "#005595"],
  "vancouver whitecaps": ["VAN", "#00245E", "#9DC2EA"],
  "inter miami": ["MIA", "#F7B5CD", "#231F20"],
  "portland timbers": ["POR", "#004812", "#D69A00"],
  "orlando city": ["ORL", "#633492", "#FDE192"],
  "minnesota united": ["MIN", "#8CD2F4", "#231F20"],
  "colorado rapids": ["COL", "#960A2C", "#9CC2EA"],
  "sporting kc": ["SKC", "#93B1D7", "#002F65"],
  "new england revolution": ["NE", "#0A2240", "#CE0E2D"],
  nycfc: ["NYC", "#6CACE4", "#041E42"],
  "dc united": ["DC", "#101010", "#EF3E42"],
  "toronto fc": ["TOR", "#B81137", "#455560"],
  cincinnati: ["CIN", "#F05323", "#263B80"],
  "san diego fc": ["SD", "#0A1D38", "#F4B6A5"],
  "st. louis city": ["STL", "#DD004A", "#0A1E2C"],
  // National teams
  argentina: ["ARG", "#74ACDF", "#FFFFFF"],
  brazil: ["BRA", "#FEDD00", "#009C3B"],
  mexico: ["MEX", "#006847", "#CE1126"],
  usa: ["USA", "#0A3161", "#B31942"],
  canada: ["CAN", "#D80621", "#FFFFFF"],
  colombia: ["COL", "#FCD116", "#003893"],
  uruguay: ["URU", "#5CBFEB", "#FFFFFF"],
  japan: ["JPN", "#001E62", "#BC002D"],
  "south korea": ["KOR", "#CD2E3A", "#0047A0"],
  australia: ["AUS", "#FFCD00", "#00843D"],
  "new zealand": ["NZL", "#F5F5F5", "#101010"],
  morocco: ["MAR", "#C1272D", "#006233"],
  egypt: ["EGY", "#CE1126", "#101010"],
  algeria: ["ALG", "#006233", "#FFFFFF"],
  tunisia: ["TUN", "#E70013", "#FFFFFF"],
  "ivory coast": ["CIV", "#F77F00", "#009E60"],
  nigeria: ["NGA", "#008751", "#FFFFFF"],
  ghana: ["GHA", "#006B3F", "#FCD116"],
  senegal: ["SEN", "#00853F", "#FDEF42"],
  cameroon: ["CMR", "#007A5E", "#CE1126"],
  "south africa": ["RSA", "#007749", "#FFB612"],
  uganda: ["UGA", "#FCDC04", "#D90000"],
  botswana: ["BOT", "#6DA9D2", "#101010"],
  "congo dr": ["COD", "#007FFF", "#CE1021"],
  comoros: ["COM", "#3A75C4", "#FFC61E"],
  mauritius: ["MRI", "#EA2839", "#1A206D"],
  seychelles: ["SEY", "#003F87", "#FCD856"],
  uzbekistan: ["UZB", "#1EB53A", "#0099B5"],
  "saudi arabia": ["KSA", "#006C35", "#FFFFFF"],
  qatar: ["QAT", "#8A1538", "#FFFFFF"],
  iran: ["IRN", "#239F40", "#DA0000"],
  jordan: ["JOR", "#CE1126", "#007A3D"],
  palestine: ["PLE", "#009736", "#CE1126"],
  syria: ["SYR", "#CE1126", "#101010"],
  china: ["CHN", "#DE2910", "#FFDE00"],
  india: ["IND", "#1C4E9D", "#FF9933"],
  "hong kong": ["HKG", "#DE2910", "#FFFFFF"],
  england: ["ENG", "#F5F5F5", "#CF081F"],
  france: ["FRA", "#002395", "#ED2939"],
  germany: ["GER", "#F5F5F5", "#101010"],
  spain: ["ESP", "#AA151B", "#F1BF00"],
  portugal: ["POR", "#046A38", "#DA291C"],
  italy: ["ITA", "#0066CC", "#FFFFFF"],
  netherlands: ["NED", "#FF6F00", "#21468B"],
  panama: ["PAN", "#DA121A", "#072357"],
  bolivia: ["BOL", "#007934", "#F9E300"],
  azerbaijan: ["AZE", "#00B5E2", "#EF3340"],
  gibraltar: ["GIB", "#DA000C", "#FFFFFF"],
  lithuania: ["LTU", "#FDB913", "#006A44"],
  malta: ["MLT", "#CF142B", "#FFFFFF"],
  liechtenstein: ["LIE", "#002B7F", "#CE1126"],
  tajikistan: ["TJK", "#CC0000", "#006600"],
  kyrgyzstan: ["KGZ", "#E8112D", "#FFEF00"],
  turkmenistan: ["TKM", "#00843D", "#D22630"],
};

const ALIASES: Record<string, string> = {
  "manchester united": "manchester utd",
  "man utd": "manchester utd",
  "man city": "manchester city",
  "tottenham hotspur": "tottenham",
  "newcastle united": "newcastle",
  "leeds united": "leeds",
  "brighton & hove albion": "brighton",
  "brighton and hove albion": "brighton",
  "ipswich town": "ipswich",
  "afc bournemouth": "bournemouth",
  "coventry city": "coventry",
  "united states": "usa",
  "korea republic": "south korea",
  "cote d'ivoire": "ivory coast",
  "côte d'ivoire": "ivory coast",
  "los angeles fc": "lafc",
  "fc dallas": "dallas",
  "cf montreal": "montreal",
  "charlotte fc": "charlotte",
  "new york red bulls": "new york rb",
  "seattle sounders fc": "seattle sounders",
  "inter miami cf": "inter miami",
  "new york city fc": "nycfc",
  "fc cincinnati": "cincinnati",
};

// Short codes for the Big Balls leagues (La Liga, Serie A, Bundesliga,
// Ligue 1, Champions League), keyed by the feed's own names. Without these
// the fallback built codes from initials — "Bayer Leverkusen" became "BL",
// "Real Madrid" "RM". Code only: colours still come from the fallback until
// these clubs get full entries in TEAMS.
const CODES: Record<string, string> = {
  // Bundesliga
  "1. fc union berlin": "FCU",
  "bayer leverkusen": "LEV",
  "bayern munich": "BAY",
  "borussia dortmund": "BVB",
  "borussia mönchengladbach": "BMG",
  "eintracht frankfurt": "SGE",
  "fc augsburg": "FCA",
  "fc cologne": "KOE",
  "hamburger sv": "HSV",
  mainz: "M05",
  "rb leipzig": "RBL",
  "sc freiburg": "SCF",
  "sc paderborn 07": "SCP",
  "schalke 04": "S04",
  "sv elversberg": "SVE",
  "tsg hoffenheim": "TSG",
  "vfb stuttgart": "VFB",
  "werder bremen": "SVW",
  // La Liga
  alavés: "ALA",
  "athletic club": "ATH",
  "atlético madrid": "ATM",
  barcelona: "BAR",
  "celta vigo": "CEL",
  elche: "ELC",
  espanyol: "ESP",
  getafe: "GET",
  levante: "LEV",
  málaga: "MAL",
  osasuna: "OSA",
  "rayo vallecano": "RAY",
  "rc deportivo la coruña": "DEP",
  "real betis": "BET",
  "real madrid": "RMA",
  "real racing club de santander": "RAC",
  "real sociedad": "RSO",
  "sevilla fc": "SEV",
  valencia: "VAL",
  villarreal: "VIL",
  // Serie A
  "ac milan": "MIL",
  "as roma": "ROM",
  atalanta: "ATA",
  bologna: "BOL",
  cagliari: "CAG",
  "como 1907": "COM",
  fiorentina: "FIO",
  frosinone: "FRO",
  genoa: "GEN",
  "inter milan": "INT",
  juventus: "JUV",
  lazio: "LAZ",
  lecce: "LEC",
  monza: "MON",
  napoli: "NAP",
  parma: "PAR",
  sassuolo: "SAS",
  torino: "TOR",
  udinese: "UDI",
  "venezia fc": "VEN",
  // Ligue 1
  "aj auxerre": "AUX",
  angers: "ANG",
  "as monaco": "MON",
  brest: "BRE",
  "le havre ac": "HAC",
  "le mans": "LEM",
  lens: "LEN",
  lille: "LIL",
  lorient: "LOR",
  lyon: "LYO",
  marseille: "MAR",
  nice: "NIC",
  "paris fc": "PFC",
  "paris saint-germain": "PSG",
  "stade rennais": "REN",
  strasbourg: "STR",
  toulouse: "TOU",
  troyes: "TRO",
  // Champions League (the rest)
  "club brugge kv": "BRU",
  "fc porto": "POR",
  "fenerbahçe sk": "FEN",
  "feyenoord rotterdam": "FEY",
  "fk bodø/glimt": "BOD",
  "fk shakhtar donetsk": "SHA",
  "galatasaray sk": "GAL",
  "lask linz": "LAS",
  "pae aek": "AEK",
  psv: "PSV",
  "sabah fk": "SAB",
  "sk slavia praha": "SLA",
  "šk slovan bratislava": "SLO",
  "sporting clube de portugal": "SCP",
  "viking fk": "VIK",
};

function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function inkFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.38 ? "#0A0A0A" : "#FFFFFF";
}

function codeFor(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return (words[0] ?? "?").slice(0, 3).toUpperCase();
}

export function teamIdentity(name: string): TeamIdentity {
  const key = name.trim().toLowerCase();
  const nickname = key.split(/\s+/).pop() ?? key;
  const entry = TEAMS[ALIASES[key] ?? key] ?? NFL[nickname];
  if (entry) {
    const [code, primary, secondary] = entry;
    return { code, primary, secondary, ink: inkFor(primary) };
  }
  const hue = hashHue(key);
  const primary = hslToHex(hue, 0.55, 0.4);
  return { code: CODES[key] ?? codeFor(name), primary, secondary: hslToHex((hue + 40) % 360, 0.6, 0.72), ink: inkFor(primary) };
}

/**
 * A room's call, shortened for cards where the crests above already say
 * who's playing:
 * - names both teams → both become codes:
 *   "Seattle Sounders v Real Salt Lake ends in a draw" → "SEA v RSL ends in a draw"
 * - names one team → the name stays in full (a lone code is too cryptic)
 *   and reads as a call: "Kansas City Chiefs win" → "Kansas City Chiefs to win"
 */
export function abbreviateClaim(claim: string, homeTeam: string, awayTeam: string): string {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const teams = [homeTeam, awayTeam].filter(Boolean).sort((a, b) => b.length - a.length); // longest first
  const named = teams.filter((t) => new RegExp(escape(t), "i").test(claim));
  if (named.length >= 2) {
    return teams.reduce((text, team) => text.replace(new RegExp(escape(team), "gi"), teamIdentity(team).code), claim);
  }
  return named.reduce((text, team) => text.replace(new RegExp(`(${escape(team)})\\s+wins?\\b`, "i"), "$1 to win"), claim);
}

const COMPETITION_SHORT: Record<string, string> = {
  "premier league": "EPL",
  "english premier league": "EPL",
  "champions league": "UCL",
  "uefa champions league": "UCL",
  "europa league": "UEL",
  "conference league": "UECL",
  "la liga": "LaLiga",
  "serie a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue 1": "Ligue 1",
  "fa cup": "FA Cup",
  "world cup": "WC",
  "fifa world cup": "WC",
  friendlies: "Friendly",
  "international friendlies": "Friendly",
};

/** A competition's short name for tight spots — "Premier League" → "EPL". */
export function competitionShort(name: string): string {
  const known = COMPETITION_SHORT[name.trim().toLowerCase()];
  if (known) return known;
  if (name.length <= 10) return name;
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
