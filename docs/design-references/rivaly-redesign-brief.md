# Rivaly Master Redesign Brief

Given by the founder, 2026-08-12. This is a design-direction reference for
Rivaly's overall product design — the waitlist and, later, the full app.
Read alongside [anti-slop-design-law.md](anti-slop-design-law.md) (the
pols.dev anti-slop law) — both sit on top of the core masterplan
(`docs/masterplan/`), which remains the source of truth for product scope
and first principles. Where this brief's specific direction (fonts, exact
section structure) conflicts with a firm product decision already made
elsewhere (e.g. the waitlist's single-viewport, no-scroll layout), the
existing decision wins unless the founder says otherwise — this is a
design-language reference, not a replacement for settled product decisions.

References to study and apply:
1. **Emil Kowalski — Design Engineering** (github.com/emilkowalski/skills) —
   the `emil-design-eng` skill: UI polish, interaction quality, animation
   restraint, component craft, spacing, easing, responsive interactions,
   micro-details, performance, accessibility, knowing when not to animate.
   Small, seemingly invisible decisions compound into a high-quality interface.
2. **Pols** (pols.dev) — general design principles.
3. **Anti-Slop Design Rules** (vibecodekit.dev/ai-slop-design) — see the
   full law saved alongside this file.

## Product

Rivaly is a social peer-to-peer prediction platform beginning with football.
People make predictions, back opinions, challenge other people, watch
predictions unfold, and build reputation. The fundamental idea: **people
want to compete with people.**

Rivaly is not a sportsbook. Not a casino. Not a traditional prediction-market
interface. Not a crypto dashboard. It is a social experience built around
prediction and rivalry.

## Destroy the generic design language

Discard anything that makes Rivaly look like: generic AI SaaS, sportsbook UI,
casino UI, crypto UI, trading terminals, generic Web3, template landing
pages, over-designed startup websites.

Avoid: purple gradients, excessive gradients, glassmorphism everywhere,
glowing pill buttons, decorative stars, excessive neon, random floating
cards, giant football graphics, stock photography, unnecessary icons,
excessive rounded containers, fake statistics, fake testimonials, feature
grids, generic "How it works" cards, excessive animation, visual clutter.

Every element must have a reason to exist.

## Design direction

Rivaly should feel like: **premium consumer technology × editorial sports
culture × sophisticated social product.**

The visual language: premium, minimal, human, competitive, confident,
slightly futuristic, editorial, tactile, emotionally charged but restrained.
The interface should not scream — the rivalry creates the energy.

## The core emotional idea

*I have an opinion. You disagree. Let's find out who's right.*

## Brand principles to design around

Prediction is the product. People are the competition. Money creates
stakes. Experience creates emotion. Trust must be visible. Football comes
first. People want to beat people. Rivalry creates stories. Sharing is
gameplay. Reputation matters. Simplicity wins.

## Visual system

**Color** — deep midnight navy/near-black background; Rivaly blue primary;
Rivaly green secondary; soft white/off-white text; cool muted gray
secondary text. Blue and green represent opposing sides. No purple, no
gold, no rainbow gradients, no excessive glow, no unrelated accent colors.

**Typography** — premium modern sans-serif with excellent weight variation.
Not Inter for headlines. Headlines: confident, editorial, modern, highly
legible. Body: clean, readable. Mathematical type scale. Typography should
carry much of the visual identity.

**Spacing** — generous negative space, used to establish hierarchy, not
filled just because it exists. Prefer space → hierarchy → typography →
subtle borders over cards → shadows → gradients → decorations.

## The most important rule: show the social layer

Don't explain Rivaly with paragraphs. Show it. Instead of "Rivaly allows
users to challenge other users," show:

> Arsenal scores 3+ tonight.
> YES — 64% · NO — 36%
> Daniel disagrees. 24 rivals are watching. Alex challenged Daniel.

The interface itself should explain the product.

## Landing page narrative (reference structure)

A short, intentional narrative — not a giant SaaS page, not an endless
feature list. Visitor moves through: curiosity → tension → understanding →
desire → action.

1. **The hook** — "You think you know football. Prove it." / "Back your
   opinion. Find someone who disagrees." / CTA: "Join the first rivals →".
   Hero visually shows two opposing sides and a live Rivaly prediction.
2. **The tension** — YOU ("Arsenal scores 3+.") vs YOUR RIVAL ("No
   chance."). Let the interaction communicate it, don't over-explain.
3. **The experience** — show an actual Rivaly prediction (Arsenal vs
   Chelsea example above) plus selective social activity (@Daniel
   disagrees, @Alex backed Arsenal, 24 rivals watching). The prediction is
   the hero.
4. **Social** — people challenging, backing, reacting, watching,
   disagreeing. Not a wall of notifications — only interactions that
   communicate the experience.
5. **The philosophy** — one of the strongest moments on the page: "The
   house isn't your rival. People are." Minimal composition, large
   typography, huge whitespace, no unnecessary UI.
6. **Waitlist** — "Find your rival. Rivaly is opening soon." Email input.
   "Join the first rivals →". Should feel like joining the beginning of
   something, not subscribing to a newsletter.

### Post-signup

Not "Thanks for joining." Instead: "You're in." then "Now find your first
rival." Give a simple share action, e.g.:

> I just joined Rivaly. A place to back your football opinions against
> real people. Who's taking the other side? [Share on X →]

Loop: signup → share → friend joins → new rival → more activity → more
signups. The growth loop should feel like gameplay, not referral marketing.

## Core product (future — not the waitlist)

For when the actual app gets built:

- **Explore** — "What's happening right now?" Interesting predictions,
  people, rivalries.
- **Prediction** — the central social object: event, claim, opposing
  sides, people, live activity, conversation, status, eventual outcome.
  Extremely simple.
- **Create** — "What do you believe? Who's taking the other side?" Feels
  like expressing an opinion, not filling a financial form.
- **Profile** — communicates reputation, not vanity. "Is this person worth
  challenging?" Predictions, wins, calls, rivals, history, reputation.
- **Activity** — communicates that Rivaly is alive ("Daniel challenged
  Alex," "24 people joined the prediction"). Motion restrained and
  meaningful.

## Motion

Apply Emil Kowalski's motion philosophy. Motion communicates state
changes, live activity, challenges, prediction states, confirmation,
resolution — not decoration. Avoid constant floating, bouncing, excessive
parallax, decorative movement, unnecessary transitions. Buttons feel
responsive with subtle press feedback. Animate only where it improves
comprehension or emotional feedback. Respect `prefers-reduced-motion`.

## Final quality test (run before approving any screen)

- Does it look like a sportsbook? → Redesign.
- Does it look like an AI-generated startup? → Redesign.
- Does it look like a crypto dashboard? → Redesign.
- Is there an element that doesn't serve a purpose? → Remove it.
- Does it communicate people competing with people? → If not, redesign.
- Does it feel premium enough to represent a new category? → Keep refining.

## North star

Rivaly should not feel like a website explaining a product. It should feel
like the first glimpse into a new social behavior.

> an opinion → another person who disagrees → a challenge → a result

*I think I'm right. You think you're right. Let's find out.* That's Rivaly.
