---
name: rivaly-engagement-psychology
description: Proven psychological mechanisms behind why X, TikTok, live sports, viewing centers, and habit-forming apps keep people coming back — variable reward, anticipation, goal-euphoria, social identity/rivalry, loss aversion, investment. Use this whenever designing, building, or reviewing ANY Rivaly page, feature, notification, reward, or interaction meant to bring users back (home feed, room cards, Arena, streaks, achievements, notifications, empty states, onboarding, celebration moments). Do not skip this for anything touching retention, urgency, rewards, or emotional pacing — this is the knowledge base for making Rivaly the thing people can't wait to open.
---

# Rivaly Engagement Psychology

Research base for making Rivaly the platform people build their weekend around — the same
mechanisms that make X, TikTok, live football, and slot machines genuinely hard to put down,
broken down by what each one is, why it works at the neurological/behavioral level, and how to
point it at Rivaly. Full sourcing and extended notes: `references/psychology-research-notes.md`.

## 1. Variable-ratio reinforcement — the single strongest mechanism there is

Unpredictable rewards are far more compelling than predictable ones. This is B.F. Skinner's
operant-conditioning finding: behavior reinforced on a variable schedule is the most resistant
to extinction of any reinforcement pattern — more so than rewarding every time, more so than a
fixed schedule. It's the literal mechanism behind slot machines, and it's also the literal
mechanism behind X's timeline and TikTok's feed: you don't know if the next scroll is the good
one, so you keep scrolling. The brain doesn't just respond to the reward — it responds to the
*possibility* of the reward, which is why the anticipation phase can be more activating than the
payoff itself.

**Where this lives in Rivaly**: a feed, a room list, or a notification stream that never lets the
user predict exactly what's coming next. Real wins, real losses, real banter, a hot room, a rival
just entering — interleaved so the next scroll always has a real shot at being the interesting
one. This is the mechanism to point at the home feed, Arena, and notifications above everything
else on this list.

## 2. Anticipation as the dominant emotion, not the outcome

Unpredictable-reward research shows the anticipation phase activates reward circuitry *more*
strongly than the resolution does. TikTok's whole design is engineering "what's next" — but
football hands you this for free: a countdown to kickoff, a penalty being placed, a match
entering injury time at 1-1. The tension before the resolution is the product, more than the
resolution itself.

**Where this lives in Rivaly**: kickoff countdowns, live win-probability movement, "your rival
just entered" pings, a room's pool visibly climbing as kickoff nears. Anywhere there's a real
not-yet-resolved beat, surface it — don't wait for the outcome to be the only interesting moment.

## 3. Goal-euphoria: rare, shared, identity-linked

When a fan's team scores, the brain's reward centers activate the way they would for a personal
win — and this effect is specifically amplified by scarcity. Goals are massive *because* they're
rare inside 90 minutes of unresolved tension; irregular, intermittent rewards produce more
persistent reward-seeking behavior than frequent ones. Crowds amplify it further — a stadium or
a viewing center becomes a shared emotional system, not a room of individuals independently
reacting, and highly invested fans show measurable physiological arousal (heart rate, cortisol)
during big moments.

**Where this lives in Rivaly**: the biggest celebratory beat in the whole product (motion,
sound, full-screen — whatever "loud" means at its ceiling) should be reserved for genuinely rare
moments — a big win, a room settling in your favor, a milestone. Save the ceiling. If a small
celebratory animation fires on routine actions, the big one stops registering as big — habituation
is fast and permanent once it sets in.

## 4. Social identity and rivalry — the strongest lever available here

People categorize into in-groups and out-groups as a core part of self-esteem and belonging.
Across the sports-fandom research, **in-group favoritism (rooting for your own side) is a
stronger, more consistent effect than out-group derogation (hating the rival)** — the reward is
in belonging and identity, not primarily in opposition. This is the single most Rivaly-specific
finding in this whole set: a product literally named for rivalry is sitting on the strongest
lever the psychology research identifies.

**Where this lives in Rivaly**: name the specific rival everywhere the UI can — "you vs
@danielk" beats "70% Yes." Head-to-head records, a running tally against one specific person,
"your circle" framing over anonymous global stats. Global leaderboards still matter, but named
rivalry is the stronger pull.

## 5. Loss aversion and streaks

Duolingo's data: users who reach a 7-day streak are ~3.6x more likely to finish their course,
and 7+ day streaks correlate with ~2.4x higher next-day return rate. Loss aversion — losing
something feels worse than gaining the equivalent feels good — is what makes a streak counter
work at all, and it measurably kicks in around the one-week mark, not immediately. The design
detail with the biggest effect on longevity: pairing the pressure with forgiveness (streak
freezes, repair mechanics) so a single missed day doesn't erase weeks of built-up motivation and
flip the mechanic from momentum into shame.

**Where this lives in Rivaly**: the daily streak already shipped (`use-daily-streak.ts`) is the
foundation. Escrowed/pending balance framing ("money at play") is the same loss-aversion lever
applied to stakes instead of days.

## 6. Investment — the fourth Hook Model stage

The classic habit loop (trigger → action → variable reward → investment) closes with investment:
the more a user puts into a product — history, progress, reputation — the more reason they have
to return, and the more valuable the product becomes to them specifically (this compounds:
investment makes future triggers more effective). Prediction history, a rivalry record,
achievement progress, a Rivaly Score are all investment mechanics already in the product.

**Where this lives in Rivaly**: anything that gives a real, accumulating reason to check back —
an accuracy trend line, a head-to-head record against a specific rival, a growing badge
collection. The stronger the sense that "I've built something here," the harder it is to leave.

## 7. Near-miss and sunk-cost — gambling's two sharpest tools

**Near-miss**: slot machines are tuned to produce "almost won" outcomes far more often than
random chance would, because a near-miss activates the same reward-processing region (ventral
striatum) as an actual win, despite being an objective loss — and it measurably extends how long
people keep playing. **Sunk cost**: once money/time is already committed, the urge to "win it
back" overrides rational stopping, and betting after a loss typically increases stake size,
accelerating the loss. Both are the two most potent, most studied compulsion mechanics in
existence — worth knowing in full, because they show up everywhere for anywhere close cost/win
framing exists in a product, not only in literal gambling.

## 8. Cognitive biases in the toolkit

- **Social proof** — strongest when it comes from someone *similar* to the viewer, specific and
  recent, not a large anonymous aggregate.
- **FOMO** — the discomfort of missing what others are experiencing; a genuine driver of
  immediate action.
- **Endowment effect** — people value something more the moment they feel ownership over it,
  even before formally acquiring it — a started prediction, a partially built streak, a
  claimed spot in a room all trigger this.
- **Scarcity** — perceived limitation raises perceived value on its own, independent of whether
  the underlying thing is actually scarce.

## 9. SportyBet — the actual growth story

Documented growth drivers: mobile-first design built specifically for African connectivity and
device constraints (not a translated European product), low minimum stakes matched to the real
local market, fast local payment rails, and credibility partnerships (Real Madrid, Mastercard).
The pattern across the winning products in this market has been removing friction for an
underserved mobile-first audience more than psychological engineering — worth remembering when
weighing "add another mechanic" against "make the real thing faster."

## Going deeper

`references/psychology-research-notes.md` — full sourcing for every mechanism above, plus
additional detail (crowd physiology at live matches, the Hook Model's original text, streak
data specifics) that's useful before leaning heavily on one particular mechanism in a design.
