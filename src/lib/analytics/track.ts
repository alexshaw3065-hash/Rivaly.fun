"use client";

// Product analytics, first-party: events queue in the browser and go to
// /api/track in small batches (or as a beacon when the tab hides). Nothing
// personal is ever sent — event names, the path, and a few short facts.
// Respects Do Not Track and a per-browser opt-out.
//
//   anon id   random, per browser (localStorage), never tied to a person
//             until they sign in (then linked server-side)
//   session   new after 30 minutes idle; carries where the visit came from
//   first touch  the very first source this browser arrived from, kept in a
//             cookie so signup can record which channel brought the user

const AID = "rvl_aid";
const SESS = "rvl_sess";
const OPT_OUT = "rvl_no_track";
const FIRST_TOUCH = "rvl_ft";
const IDLE_MS = 30 * 60_000;

type Props = Record<string, string | number | boolean>;
interface Queued {
  e: string;
  p: string;
  props?: Props;
  t: number;
}
interface Session {
  id: string;
  last: number;
  src: { ref?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string };
}

const queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let wired = false;
// React (and Next in development) can run a page's effect twice; one page view per page.
let lastView = { path: "", at: 0 };

const rand = () => {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/[+/=]/g, (c) => (c === "+" ? "-" : c === "/" ? "_" : ""));
};

/** The browser itself asks sites not to track (Do Not Track, or Global Privacy Control — Firefox, Brave, DuckDuckGo). */
export function browserSaysDontTrack(): boolean {
  try {
    return navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  } catch {
    return false;
  }
}

function disabled(): boolean {
  try {
    return typeof window === "undefined" || browserSaysDontTrack() || localStorage.getItem(OPT_OUT) === "1" || location.pathname.startsWith("/admin");
  } catch {
    return true;
  }
}

function anonId(): string {
  let id = localStorage.getItem(AID);
  if (!id) {
    id = rand();
    localStorage.setItem(AID, id);
  }
  return id;
}

function source(): Session["src"] {
  const q = new URLSearchParams(location.search);
  const ref = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : undefined;
  // ?ref=<username> is a person's referral link: source = who, medium = referral.
  const referral = q.get("ref")?.match(/^[A-Za-z0-9_]{2,30}$/)?.[0];
  return {
    ref,
    utm_source: q.get("utm_source") ?? referral ?? undefined,
    utm_medium: q.get("utm_medium") ?? (referral ? "referral" : undefined),
    utm_campaign: q.get("utm_campaign") ?? undefined,
  };
}

function session(): Session {
  const now = Date.now();
  let s: Session | null = null;
  try {
    s = JSON.parse(localStorage.getItem(SESS) ?? "null") as Session | null;
  } catch {}
  // New session after 30 minutes idle — or when this visit arrives from a new
  // campaign or another site (a new source is a new visit, as in any analytics tool).
  const here = source();
  const newSource = Boolean(here.utm_source || here.utm_campaign || here.ref) && JSON.stringify(here) !== JSON.stringify(s?.src ?? {});
  if (!s || now - s.last > IDLE_MS || newSource) s = { id: rand(), last: now, src: here };
  s.last = now;
  localStorage.setItem(SESS, JSON.stringify(s));
  return s;
}

/** The first source this browser ever came from, for signup attribution (cookie, 180 days). */
function rememberFirstTouch(src: Session["src"]) {
  if (document.cookie.split("; ").some((c) => c.startsWith(`${FIRST_TOUCH}=`))) return;
  let host: string | undefined;
  try {
    host = src.ref ? new URL(src.ref).hostname.replace(/^www\./, "") : undefined;
  } catch {}
  const ft = { source: src.utm_source, medium: src.utm_medium, campaign: src.utm_campaign, referrer_host: host, landing_path: location.pathname, at: new Date().toISOString() };
  document.cookie = `${FIRST_TOUCH}=${encodeURIComponent(JSON.stringify(ft))}; path=/; max-age=${180 * 86400}; samesite=lax`;
}

function flush(useBeacon = false) {
  if (timer) clearTimeout(timer);
  timer = null;
  if (queue.length === 0) return;
  const batch = queue.splice(0, 25);
  let s: Session;
  try {
    s = session();
  } catch {
    return;
  }
  const body = JSON.stringify({ a: anonId(), s: s.id, src: s.src, events: batch });
  if (useBeacon && navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
  else void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
  if (queue.length) flush(useBeacon);
}

function wire() {
  if (wired) return;
  wired = true;
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush(true));
  window.addEventListener("pagehide", () => flush(true));
}

/** Record a product action. Safe to call anywhere; a no-op on the server, under DNT, or when opted out. */
export function track(event: string, props?: Props) {
  if (disabled()) return;
  try {
    wire();
    const s = session();
    rememberFirstTouch(s.src);
    if (event === "page_view") {
      if (lastView.path === location.pathname && Date.now() - lastView.at < 1000) return;
      lastView = { path: location.pathname, at: Date.now() };
    }
    queue.push({ e: event, p: location.pathname, props, t: Date.now() });
    if (!timer) timer = setTimeout(() => flush(), 1500);
  } catch {}
}

const PREF_EVENT = "rvl-tracking-pref";

export function setTrackingOptOut(out: boolean) {
  try {
    if (out) {
      localStorage.setItem(OPT_OUT, "1");
      queue.length = 0; // nothing already queued goes out either
    } else localStorage.removeItem(OPT_OUT);
  } catch {}
  window.dispatchEvent(new Event(PREF_EVENT));
}

/** "on" (sharing), "off" (opted out here), or "browser" (the browser asks not to be tracked). */
export function trackingPreference(): "on" | "off" | "browser" {
  if (typeof window === "undefined") return "on";
  if (browserSaysDontTrack()) return "browser";
  try {
    return localStorage.getItem(OPT_OUT) === "1" ? "off" : "on";
  } catch {
    return "off";
  }
}

export function subscribeTrackingPreference(cb: () => void): () => void {
  window.addEventListener(PREF_EVENT, cb);
  return () => window.removeEventListener(PREF_EVENT, cb);
}
