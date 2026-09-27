# Rivaly — Visual system & polish rebuild

**Status:** approved 2026-09-27 with the recommended defaults (Cabinet Grotesk +
Geist, full-round chips, CSS-only motion, light mode kept). **Phase 0 done**
(tokens, mobile-native baseline, haptics helper, `npm run lint:design` —
baseline 833 drift items: font-size 428, raw-hex 120, shadow 71, radius 15,
off-grid 162, mono-label 37). Next: Phase 1, the component kit.

Written 2026-09-27. Scope: polish the **existing** app — styling, type, colour,
spacing, components, interactions, motion, responsiveness — so it feels like
an installed mobile app. **No new features, no architecture changes, no
product-concept changes.** Every screen keeps its job; it gets a consistent
body.

Sources this plan is built on:
- Repo: `docs/masterplan/04-design-principles.md`, `06-emotion-design.md`,
  `docs/design-references/rivaly-redesign-brief.md`, `anti-slop-design-law.md`,
  `emil-design-engineering.md`, the `anti-slop-design` and
  `rivaly-engagement-psychology` skills.
- Emil Kowalski's skills (github.com/emilkowalski/skills, pulled today):
  `mobile-native`, `apple-design`, `animate`, `improve-animations`,
  `find-animation-opportunities`, `review-animations`, performance cheatsheet.
- Expo skills (docs.expo.dev/skills): `expo-design-system` (tokens, variants,
  drift audit, the 20 "native-slop" tells), `expo-animation` (haptics/motion).
- Live teardown today (phone viewport, computed styles) of **Polymarket**, **Kalshi** and **FotMob** — see the comparison table in §3.4b. Earlier: **Polymarket**
  (home + the Cardinals v 49ers game page) and **Kalshi**.

---

## 1. What the app looks like today (audit)

168 component files. The product is strong; the *system* underneath it drifted:

| Area | Today | Problem |
|---|---|---|
| Type sizes | **24 sizes** (`text-sm` 325×, `text-[12px]` 116×, `[13px]` 112×, `[11px]` 86×, `[10px]`, `[9px]`, `[15px]`, `[17px]`, `[19px]`, `[21px]`, `[22px]`, `[28px]`, `[40px]`…) | No ramp. Hierarchy is guessed per screen. Polymarket/Kalshi use ~5 sizes. |
| Weights | medium / semibold / bold / extrabold / black mixed freely | Emphasis means nothing when everything is bold. |
| Monospace | `font-mono` in **67 files**, 37 as UPPERCASE tracked labels | "Monospace as the house voice" — a named generic-AI tell. |
| Radii | `full` 217×, `md` 85×, `xl` 83×, `lg` 68×, `2xl` 38× + 5 one-offs | Five-plus radii, no rule for which is which. |
| Colour | Good tokens exist, but **~50 raw hexes in components** (`#f5a524`, `#f5c542`, `#ff6b6b`, `#d64040`…) | Dark/light drift; one-off accents. |
| Press feedback | 10 different `active:scale-*` values, scale on list rows too | "The squish reflex" — rows should highlight, buttons press. |
| Hover | Ungated `:hover` in places | Sticky hover after tap on phones. |
| Navigation | **No `loading.tsx` anywhere** | Tapping into a room/profile shows *nothing* until the server finishes — the exact "TAP → NOTHING → WAIT" the brief forbids. |
| Mobile baseline | No `viewport-fit=cover`, no `theme-color`, tap-highlight flash on, no `touch-action: manipulation` | Reads as "a website in a browser". |
| Motion | Good custom curve already in use (`0.23,1,0.32,1`), 22 keyframes, but durations/curves duplicated inline | Right instincts, no tokens; hard to keep consistent. |

What's already right and stays: dark-first "night football" identity; YES blue
vs NO red as the core mechanic; green only for money/wins; Cabinet Grotesk as
a non-reflex display face; the stadium stage as the signature artifact; crests
and league badges; the loud moments reserved for goals/wins.

## 2. What we borrow — and what we don't

Per CLAUDE.md: **borrow mechanisms, not identities.**

From Polymarket / Kalshi (measured, not guessed):
- **A tight type scale** — both sit on ~11/13/14/15/16/24 px. Few sizes, used strictly.
- **Fine-tuned variable weights** — Polymarket runs Inter at 440 (body), 490
  (buttons), 590 (titles): calmer than 400/600 jumps.
- **Slight negative tracking** on 14px+ UI text (−0.09px at 14px).
- **Tinted side pills** — Yes/No as the side's colour at ~15% fill with the
  label in full colour (27px tall, ~5px radius); solid fills only for the
  committed action.
- **Borderless cards** — separation by a 1px ring at ~6% opacity + surface
  contrast, ~15px radius; no drop shadows on cards.
- **Filter chips** 32px tall; active = 10% brand tint + brand text.
- **Icon-over-label bottom tabs**, 11px/500 labels (we already shipped this).
- **Live game header** (Polymarket's game page): crests, big score, a small
  red "• Q3 · 5:44" live line — our stage already does this, richer.
- **Kalshi's own brand typeface** — identity through type, not decoration.

What we reject: their light-first look, Inter/Kalshi fonts, a blue brand
wash, odds tables, price-per-share language, chart-first pages, "Build a
combo" floating pill. Rivaly stays **people-first and match-first**.

## 3. The visual direction

**Rivaly = a floodlit night match, seen through premium consumer tech.**
Near-black, calm, confident; the two sides are the only strong colours; the
match and the rival are the heroes. Loud only at goals, wins, whales.

### 3.1 Typography

| Role | Face | Notes |
|---|---|---|
| Display — scores, amounts, the call, screen titles | **Cabinet Grotesk** (kept) | Rivaly's voice. 700/800 only at 24px+. Negative tracking. |
| UI & body | **Geist Sans** (kept, variable) | Use variable weights like Polymarket: 450 body, 550 labels/buttons, 650 emphasis. |
| Numbers (money, %, stakes, clocks) | Geist with `tabular-nums` | Digits don't jiggle as they change. |
| Mono | Geist Mono — **only** invite codes, wallet addresses, tx hashes | Remove it as the default label style (37 uppercase-mono labels). |

**The ramp** — 9 named steps replace 24 sizes (mobile values; desktop +1 step on display only):

| Token | Size / line-height | Tracking | Weight | Used for |
|---|---|---|---|---|
| `display` | 40 / 1.05 | −0.03em | 800 | win amount, hero score |
| `title-1` | 28 / 1.1 | −0.025em | 800 | screen titles, big scoreboard |
| `title-2` | 22 / 1.2 | −0.02em | 700 | the call on a room, sheet titles |
| `title-3` | 18 / 1.25 | −0.015em | 700 | card headlines, section heads |
| `body-lg` | 16 / 1.45 | −0.01em | 450 | primary body, inputs (≥16px stops iOS zoom) |
| `body` | 15 / 1.45 | −0.006em | 450 | default text, chat |
| `label` | 13 / 1.3 | 0 | 550 | buttons (sm), chips, metadata, tabs |
| `caption` | 12 / 1.3 | +0.005em | 500 | timestamps, helper text |
| `micro` | 11 / 1.2 | +0.02em | 550 | bottom-tab labels, badges (never paragraphs) |

Rules: hierarchy from **size + weight + colour together**; no size below 11;
UPPERCASE only for `micro` badges (LIVE, FT, YES/NO), never paragraphs.

### 3.2 Colour

Keep the founder palette; make it a real scale and remove one-offs.

- **Neutrals (dark)**: `bg #0a0a0a` · `surface-1 #121212` · `surface-2 #1a1a1a` ·
  `surface-3 #222222`; hairline `rgba(255,255,255,0.07)`, strong `0.12`.
- **Text**: `primary #f5f5f5` · `secondary #a3a3a3` · `tertiary #6e6e6e` (today's
  single `muted #8a8a8a` splits into two levels so metadata can recede).
- **Sides**: YES `#3d6bff`, NO `#ef4444`, each with `-tint` (14% fill),
  `-tint-strong` (24%, pressed/selected) and `-ink` (text on tint, AA-checked).
- **Money**: `#1fae63` + tint — wins, payouts, "+$" only.
- **Signals**: `live` (red dot + label, never a red block), `warning` amber,
  `card-yellow` `#f5c542`, `card-red` — named tokens replacing the raw hexes.
- **Overlays**: white/black alpha scale 4/8/12/16/24% for press, hover, scrims.
- Light mode keeps the same token names with its own values (already exists;
  re-derived from the scale). Dark stays the default.
- Explicitly **no purple** (the emotion doc's "purple = community" line
  conflicts with the brief and anti-slop law — flagging, keeping it out).

### 3.3 Spacing & layout

- 4-pt grid tokens: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Screen gutter **16**; card inner padding **16**; row gap **8–12** < group gap
  **16–20** < section gap **32** — proximity must carry meaning ("16-everything" is a tell).
- Touch targets ≥ **44×44** (visual can be smaller; hit area can't).
- Content max-width 640 on mobile flows (create, wallet), 1120 on desktop feeds.

### 3.4 Shape & depth

| Token | Radius | For |
|---|---|---|
| `r-xs` | 6 | tags, side pills (Yes/No mini), small badges |
| `r-sm` | 10 | buttons, inputs, segmented controls |
| `r-md` | 14 | cards, panels, list groups |
| `r-lg` | 22 | sheets, the stadium block, modals |
| `r-full` | 999 | avatars, icon buttons, filter chips, FAB |

Depth: **no card shadows**. Surface steps + a 1px inner ring. Shadows exist
only for floating layers (sheet, menu, toast, FAB) — three tokens, tinted, tight.

### 3.4b Lines, borders, dividers & shadows (the edge system)

**Audit today:** two competing ways to draw an edge — CSS `border` (268 uses,
`border-border` 175, `border-border-strong` 41) and `ring-1` (110 uses) —
mixed freely, so neighbouring cards have different-weight edges and some get
doubled (border + divider). **43 inline `boxShadow`s** plus 10 distinct shadow
utilities (`shadow-lg/xl/sm` and four arbitrary `shadow-[…]` values). Arena
cards carry a 3px coloured bar down the left edge — the named "accent-bar
card" tell.

**The rules:**

| Element | Treatment |
|---|---|
| **Card / panel edge** | One method only: a 1px **inner ring** in `--line` (white 7% dark / black 8% light). Drawn with a single `.edge` utility (inset box-shadow) — never `border` on cards (no layout shift, no double edges when cards stack). |
| **Card interior** | No borders inside a card. Separate its parts with spacing; if a divide is truly needed, one hairline `--line`, full width of the card's content (not edge to edge). |
| **List rows** (notifications, followers, settings, wallet history) | Rows inside one grouped surface; **inset hairline dividers** that start after the avatar/icon (iOS-style), none after the last row. Never a divider *and* a card edge on the same line. |
| **Between sections** | **Space, not lines** — 32px section gap. No horizontal rules between page sections. |
| **Sticky headers / top bar / tab bar** | No permanent bottom border. A hairline (or soft fade) appears **only once content scrolls under it** (Apple's scroll-edge effect). |
| **Tabs** | 1px `--line` track + a 2px indicator under the active tab that slides between tabs (transform, 220ms `--ease-out`). |
| **Inputs** | 1px `--line-strong` border (inputs are the one place a real border belongs); focus = border to `--foreground` 40% + 3px focus ring in YES blue at 25%. Error = NO red border + message below, never a red fill. |
| **Buttons** | No borders on filled buttons. `secondary` = surface fill + `.edge` ring. `ghost` = no edge until pressed. |
| **Selected state** (chosen side, active chip) | Tint fill + 1px ring in the side colour at 40% — not a thicker border. |
| **Focus (keyboard only)** | `:focus-visible` 2px YES-blue ring with 2px offset; never shown on tap. |
| **Accent bars** | The Arena left colour bar goes; the take's side is carried by the YES/NO pill and the avatar ring instead. *(Decision 6 below.)* |

**How the references do it** (measured live at phone size, 2026-09-27):

| | Polymarket | Kalshi | FotMob | **Rivaly target** |
|---|---|---|---|---|
| Card edge | No border; 1px ring at 6% black | Thin light-grey border, faint tint | **True hairline** (0.67px = 1 device pixel) in `#f0f0f0` | 1px inner ring, `--line` (hairline on high-DPI via 0.5px where supported) |
| Card shadow | Ring + two whisper shadows at 2.5% (`0 2px 6px`, `0 2px 10px`) | Minimal | **None** | **None** (depth from surface step) |
| Card radius | ~15px | 16px | 16px | 14px (`r-md`) |
| Card padding | 12px sides | ~16px | 0 (rows pad themselves) | 16px |
| Card-to-card gap | 12px | ~16px | ~16px | 12px |
| Rows inside a card | No dividers — spacing only | Spacing | Hairlines between match rows | Inset hairlines only in list groups; spacing in cards |
| Header / tab bar edge | **No line** on either | No line | No line | No line — edge appears only when content scrolls under |
| Pills / chips | 32px chips, 6px radius; Yes/No 27px tint pills, 5px radius | Fully rounded (100px) pills | Rounded segmented buttons | Chips full-round 32px; YES/NO tint pills 6px (`r-xs`) |
| Brand typeface | Inter (variable, tuned weights) | Own face (Kalshi Sans + Condensed) | Own licensed face (GT Walsheim) | Cabinet Grotesk display + Geist UI (decision 1) |
| Type sizes in use | ~5 (11–15, 24) | ~6 (11–16, 24) | ~5 (10–14) | 9-step ramp, same discipline |
| Loading | — | — | **Skeleton blocks** while data loads | Skeletons on every route (`loading.tsx`) |

The common thread across all three: **no heavy shadows, no double edges,
no lines between big sections, one quiet edge per card.** That's exactly
where Rivaly drifts today (border + ring mixed, 43 inline shadows).

**Shadows — four tokens, nothing else:**

| Token | Value (dark) | Only for |
|---|---|---|
| `--shadow-none` | — | every card, row, chip, button on the page (depth = surface step + ring) |
| `--shadow-pop` | `0 8px 24px -8px rgb(0 0 0 / .6)` + `.edge` ring | dropdowns, menus, popovers, the moment card on the timeline |
| `--shadow-sheet` | `0 -12px 32px -12px rgb(0 0 0 / .7)` | bottom sheets, modals |
| `--shadow-fab` | `0 6px 16px -4px color-mix(YES blue 45%)` | the create / post floating button only |

Light mode uses the same tokens at roughly half the opacity. All 43 inline
shadows and 10 shadow utilities migrate to these four.

### 3.3b Spacing specifics (fixing the off-grid values)

**Audit today:** paddings and gaps use half-steps — `py-2.5` (10px) 45×,
`px-3.5` (14px) 24×, `gap-1.5` (6px) 69×, `gap-2.5` (10px) 24×, `py-1.5` 19× —
so rhythm drifts by 2px between screens.

- **Allowed values:** 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. `6` is allowed
  **only** for icon-to-label gaps inside one control.
- 10 → 8 or 12, 14 → 12 or 16, by context (listed per screen in Phase 3).
- **Component metrics** (fixed, from the kit):
  - Card padding 16 · card-to-card gap 12 · section gap 32
  - List row: 12px vertical / 16px horizontal, min-height 56 with avatar, 48 text-only
  - Chip: 32 tall, 12 horizontal padding, 8 gap between chips
  - Buttons: sm 32 tall / 12 pad · md 40 / 16 · lg 48 / 20 · cta 56 full width
  - Icon button: 36 or 40 visual, 44 hit area
  - Top bar 56 + safe area · bottom tab bar 56 + safe area
  - Stack of label + value: 4 gap; title + body: 8 gap; header + content: 16 gap

### 3.5 Motion (Emil Kowalski / Apple rules)

- Tokens: `--ease-out: cubic-bezier(0.23,1,0.32,1)` (default),
  `--ease-in-out: cubic-bezier(0.77,0,0.175,1)` (on-screen movement),
  `--ease-drawer: cubic-bezier(0.32,0.72,0,1)` (sheets). Never `ease-in`.
- Durations: press **100ms**, small **160ms**, standard **220ms**, sheet **320ms**.
  Exit faster than enter. UI stays under 300ms.
- **Frequency gate**: things seen tens of times a day (tabs, list nav, chips)
  get near-zero motion; modals/sheets/toasts get standard motion; delight is
  spent only on rare moments (goal, win, first join, milestone).
- Press: buttons `scale(0.97)` on pointer-down; **list rows highlight**, never scale.
- Transitions (interruptible) over keyframes for anything re-triggerable.
- Only `transform`/`opacity`; no `transition: all`.
- Hover styles gated to `(hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion`: movement → short cross-fades; keep colour/opacity feedback.
- The loud moments (goal sweep, win reveal, whale) stay the ceiling — audited
  so nothing routine competes with them (engagement mechanism #3, rare moments).

### 3.6 Haptics (Android; iOS Safari has no vibration API)

One `haptic(kind)` helper replacing the scattered `navigator.vibrate` calls,
mapped to the emotion spec: `tick` (create room, friend joins), `medium`
(goal, whale), `success` (win), `soft` (loss). Never on routine taps.

## 4. "Tap → response → state change → continuation"

The feel fixes, in order of impact:

1. **Instant navigation** — `loading.tsx` skeletons shaped like the real page
   for room, profile, arena, wallet, search, notifications, create. The tap
   responds in one frame; content streams in.
2. **Prefetch** tab destinations and visible room cards (Next `Link` prefetch).
3. **Pending states within 100ms** on every server action button (stake,
   follow, post, claim) — label + spinner-free progress, never a dead button.
4. **Optimistic UI** where it's safe: follow, reactions, chat (already),
   bookmarks, notification read state. *Never* optimistic on money.
5. **Mobile-native baseline** (Emil `mobile-native`): `viewport-fit=cover` +
   safe-area padding on top bar/tab bar/sheets, `theme-color` per scheme,
   `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`
   and `user-select: none` on controls, 16px inputs with correct `inputmode`
   (`decimal` for stakes), `100dvh` for full-height shells,
   `overscroll-behavior: contain` on inner scrollers.
6. **Sheets that behave natively**: drag-to-dismiss with velocity, grab
   handle, safe-area bottom padding, background scale/dim (the existing
   BottomSheet, upgraded — not replaced).
7. **Four-state screens**: loading ≠ empty ≠ error ≠ content; keep stale
   content while revalidating (no "Nothing here yet" flash before data lands).

## 5. The component kit (built once, used everywhere)

In `src/components/ui/`, each with fixed variants/sizes — screens stop styling
buttons by hand:

- `Button` — variants `primary` (white-on-black / inverse), `secondary`
  (surface), `ghost`, `yes`, `no`, `money`, `danger`; sizes `sm 32`, `md 40`,
  `lg 48`, `cta 56` (full-width primary action). Built-in pending state.
- `IconButton` — 36/40 round, 44 hit area.
- `Chip` — filter/select (32px, full radius, tint when active).
- `SidePill` — the YES/NO choice (tint → strong tint → solid when committed).
- `Tabs` — underline tabs (sliding indicator) + segmented control.
- `Surface`/`Card`, `ListRow` (highlight press), `Section` header.
- `Sheet` (upgraded BottomSheet), `Toast`, `Skeleton`, `EmptyState`.
- `Amount` / `Stat` — tabular numbers, optional count-up on change.
- `Badge` — LIVE, FT, status (micro type).
- `TeamCrest`, `LeagueMark`, `RivalCharacter` — already exist; aligned to tokens.

## 6. Order of work (each phase ships and is reviewed separately)

| Phase | What | You review |
|---|---|---|
| **0 — Foundations** | Tokens in `globals.css` `@theme` (type ramp utilities, spacing, radii, colours, line & edge utilities, the four shadow tokens, motion); mobile-native baseline; haptics helper; a `npm run lint:design` drift check (flags `text-[Npx]`, raw hex in components, off-scale radii, inline `boxShadow`, `border` on cards, off-grid spacing) | Before/after screenshots — should look ~identical, feel better on phone |
| **1 — Component kit** | Build the §5 kit against the tokens | A one-page kit preview (temporary, local) |
| **2 — Shell + instant nav** | Top bar, bottom tabs, sidebar, FAB on tokens; `loading.tsx` skeletons; prefetch; pending states | Screen recording: tap → instant response |
| **3 — Screen passes** | In order: Home → Room (stage, timeline, join, chat) → Create flow → Arena → Search → Profile → Wallet & sheets → Notifications → Auth/username → Admin (light touch) | Phone screenshots per screen, approve each |
| **4 — Motion & QA** | Motion audit (Emil `review-animations` checklist), reduced-motion pass, final drift check to zero, real-device checklist | Recording + a checklist for you to run on your phone |

Every phase: no product behaviour changes, typecheck + lint + tests green,
verified in the preview at phone size, pushed separately so any step can be
rolled back.

## 7. Decisions I need from you

1. **Fonts** — keep **Cabinet Grotesk (display) + Geist (UI)** (my
   recommendation: both are already licensed and distinctive enough), or buy
   a new brand face for a stronger identity (Kalshi-style)?
2. **Filter chips** — keep **fully rounded pills** (friendlier, social —
   recommended) or go Polymarket-style 6px corners?
3. **Motion library** — stay **CSS-only** (recommended: lighter, fastest) and
   add the small `motion` library only if sheet drag physics need springs?
4. **Light mode** — keep maintaining it alongside dark (recommended), or go
   dark-only to halve the polish work?
6. **Arena's left colour bar** — remove it (recommended; it's the
   "accent-bar card" tell and the side is already shown by the YES/NO pill)
   or keep it as a deliberate signature?
5. **The other reference tabs you mentioned** — Claude in Chrome wasn't
   connected, so I couldn't see them. Send the links (or reconnect Chrome)
   and I'll fold them in before Phase 0.

## 8. What I can't verify myself

Sticky hover, tap delay, safe areas, keyboard behaviour and haptics only show
on a real phone. Each phase ends with a short checklist for you to run on
your device; I verify everything else in the preview.
