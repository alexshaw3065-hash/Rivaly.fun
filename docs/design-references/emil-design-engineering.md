# Emil Kowalski — Design Engineering

Source: [github.com/emilkowalski/skills](https://github.com/emilkowalski/skills), `skills/emil-design-eng/SKILL.md`.
Saved verbatim 2026-08-15 as a durable reference alongside
[anti-slop-design-law.md](anti-slop-design-law.md) and
[rivaly-redesign-brief.md](rivaly-redesign-brief.md) — apply all three to
every screen of the main Rivaly app, not just the waitlist.

---

# Design Engineering

## Core Philosophy

### Taste is trained, not innate

Good taste is not personal preference. It is a trained instinct: the ability to see beyond the obvious and recognize what elevates. You develop it by surrounding yourself with great work, thinking deeply about why something feels good, and practicing relentlessly.

When building UI, don't just make it work. Study why the best interfaces feel the way they do. Reverse engineer animations. Inspect interactions. Be curious.

### Unseen details compound

Most details users never consciously notice. That is the point. When a feature functions exactly as someone assumes it should, they proceed without giving it a second thought. That is the goal.

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune." - Paul Graham

Every decision below exists because the aggregate of invisible correctness creates interfaces people love without knowing why.

### Beauty is leverage

People select tools based on the overall experience, not just functionality. Good defaults and good animations are real differentiators. Beauty is underutilized in software. Use it as leverage to stand out.

## The Animation Decision Framework

Before writing any animation code, answer these questions in order:

### 1. Should this animate at all?

**Ask:** How often will users see this animation?

| Frequency | Decision |
| --- | --- |
| 100+ times/day (keyboard shortcuts, command palette toggle) | No animation. Ever. |
| Tens of times/day (hover effects, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare/first-time (onboarding, feedback forms, celebrations) | Can add delight |

**Never animate keyboard-initiated actions.** Raycast has no open/close animation — that is the optimal experience for something used hundreds of times a day.

### 2. What is the purpose?

Valid purposes: spatial consistency (toast enters/exits from the same direction), state indication, explanation, feedback (button scales down on press), preventing jarring changes. If the purpose is just "it looks cool" and the user will see it often, don't animate.

### 3. What easing should it use?

- Entering/exiting → `ease-out`
- Moving/morphing on screen → `ease-in-out`
- Hover/color change → `ease`
- Constant motion (marquee, progress bar) → `linear`
- Default → `ease-out`

**Use custom easing curves** — built-in CSS easings lack punch.

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* iOS-like drawer curve */
```

**Never use `ease-in` for UI animations** — it delays the initial movement, the exact moment the user is watching most closely.

### 4. How fast should it be?

| Element | Duration |
| --- | --- |
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers | 200-500ms |
| Marketing/explanatory | Can be longer |

**Rule: UI animations should stay under 300ms.**

## Spring Animations

Springs feel more natural than duration-based animations — no fixed duration, settle based on physical parameters.

**Use for:** drag interactions with momentum, elements that should feel "alive," interruptible gestures, decorative mouse-tracking.

```js
// Apple's approach (recommended)
{ type: "spring", duration: 0.5, bounce: 0.2 }
```

Keep bounce subtle (0.1-0.3). Avoid bounce in most UI contexts — use for drag-to-dismiss and playful interactions only. Springs maintain velocity when interrupted; CSS keyframes restart from zero.

## Component Building Principles

- **Buttons must feel responsive**: `transform: scale(0.97)` on `:active`, `transition: transform 160ms ease-out`.
- **Never animate from `scale(0)`** — start from `scale(0.95)` + `opacity: 0`. Nothing in the real world appears from nothing.
- **Popovers scale from their trigger**, not center (`transform-origin: var(--transform-origin)`). Modals are the exception — keep them centered.
- **Tooltips**: delay before first appearance; once one tooltip is open, adjacent tooltips open instantly with no delay/animation.
- **Use CSS transitions over keyframes** for anything that can be triggered rapidly/interrupted (toasts, toggles) — transitions retarget smoothly, keyframes restart from zero.
- **Blur masks imperfect crossfades**: `filter: blur(2px)` during a transition that looks off despite tuning easing/duration. Keep blur under 20px.
- **`@starting-style`** is the modern way to animate element entry without a mount-flag `useEffect`.

## CSS Transform Mastery

- `translateY(100%)` moves by the element's own height — resilient to content changes, prefer over hardcoded px.
- `scale()` scales children too (font size, icons scale proportionally) — a feature, not a bug.
- `rotateX/Y()` + `transform-style: preserve-3d` for real 3D depth without JS.
- Set `transform-origin` to match the trigger for origin-aware interactions.

## clip-path for Animation

`clip-path: inset(top right bottom left)` — each value eats into the element from that side. Useful for: reveal-on-scroll (`inset(0 0 100% 0)` → `inset(0 0 0 0)`), tab-switch color transitions (duplicate + clip the active copy), hold-to-delete (2s linear press, 200ms ease-out release), before/after comparison sliders.

## Gesture and Drag Interactions

- **Momentum-based dismissal**: compute velocity (`distance / time`); dismiss if velocity > ~0.11 regardless of distance traveled — a quick flick should be enough.
- **Damping at boundaries**: dragging past a natural boundary should slow down, not hard-stop.
- **Pointer capture** once a drag starts, so it continues even if the pointer leaves the element.
- **Multi-touch protection**: ignore additional touch points after a drag begins.

## Performance Rules

- **Only animate `transform` and `opacity`** — they skip layout/paint and run on the GPU. Animating `padding`/`margin`/`height`/`width` triggers full reflow.
- **CSS variables are inheritable** — changing one on a parent recalculates styles for every child. Update `transform` directly on the element being dragged instead of a shared custom property.
- **Framer Motion's `x`/`y`/`scale` shorthands are not hardware-accelerated** (main-thread rAF). Use the full `transform` string for GPU accel under load.
- **CSS animations beat JS under load** — they run off the main thread; use CSS for predetermined animations, JS for dynamic/interruptible ones.

## Accessibility

- **`prefers-reduced-motion`**: reduce, don't eliminate. Keep opacity/color transitions that aid comprehension; remove movement/position animation.
- **Gate hover animations** behind `@media (hover: hover) and (pointer: fine)` — touch devices fire hover-on-tap otherwise.

## The Sonner Principles (building loved components)

1. Developer experience is key — minimal setup friction.
2. **Good defaults matter more than options** — most users never customize; the default must already be excellent.
3. Naming creates identity.
4. **Handle edge cases invisibly** (pause timers on hidden tab, capture pointer during drag) — users never notice, and that's correct.
5. Transitions over keyframes for rapidly-triggered UI.
6. Great docs / a place to touch the product.

**Cohesion matters**: the easing, duration, and personality of an animation should match the mood of the component and the product as a whole — a playful component can be bouncier, a professional dashboard should be crisp and fast.

**Asymmetric enter/exit timing**: press can be slow and deliberate (hold-to-delete: 2s linear), release should always be snappy (200ms ease-out). Slow where the user is deciding, fast where the system is responding.

## Stagger Animations

Multiple elements entering together should cascade in, not appear at once. Keep delays short — 30-80ms between items; longer reads as slow. Stagger is decorative — never block interaction while it plays.

## Review Checklist

| Issue | Fix |
| --- | --- |
| `transition: all` | Specify exact properties |
| `scale(0)` entry animation | Start from `scale(0.95)` + `opacity: 0` |
| `ease-in` on UI element | Switch to `ease-out` or a custom curve |
| `transform-origin: center` on popover | Set to trigger location (modals exempt) |
| Animation on keyboard action | Remove entirely |
| Duration > 300ms on UI element | Reduce to 150-250ms |
| Hover animation without media query | Add `@media (hover: hover) and (pointer: fine)` |
| Keyframes on rapidly-triggered element | Use CSS transitions instead |
| Framer Motion `x`/`y` props under load | Use `transform: "translateX()"` string |
| Same enter/exit transition speed | Make exit faster than enter |
| Elements all appear at once | Add stagger delay (30-80ms) |
