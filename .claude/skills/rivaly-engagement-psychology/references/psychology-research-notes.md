# Psychology research notes

Full writeup behind `SKILL.md`'s summary — sources, the fuller mechanism explanations, and a
few findings that are useful context but weren't compact enough for the always-loaded doc. Read
the relevant section before designing something that leans heavily on one mechanism; this file
isn't meant to be read start-to-finish every time.

## Variable-ratio reinforcement and infinite scroll

The core mechanism behind why X/Twitter, Instagram, and TikTok are hard to stop using is a
variable-ratio reinforcement schedule — B.F. Skinner's operant-conditioning finding that
unpredictably-rewarded behavior is the *most* resistant to extinction, more so than behavior
rewarded every time or on a fixed schedule. Instagram likes operate this way deliberately: users
never know how many likes a post will get, and that uncertainty is what keeps people checking.
Design features that reinforce the pattern: infinite scroll removes natural stopping cues,
pull-to-refresh mimics a slot-machine lever pull, and algorithmic ranking is tuned to interleave
unpredictable high-value content with low-value filler so the "next scroll" always has a real
chance of paying off.

Sources:
- [Why the infinite scroll is so addictive — UX Collective](https://uxdesign.cc/why-the-infinite-scroll-is-so-addictive-9928367019c5)
- [Why the Infinite Scroll is So Addictive: Insights from Behavioral Psychology — GoriUX](https://goriux.com/ux/why-the-infinite-scroll-is-so-addictive-insights-from-behavioral-psychology/)
- [Why Social Media Hijacks Your Brain — Variable Rewards on Tap — Feynmanpedia](https://feynmanpedia.com/dopamine-and-attention/why-social-media-hijacks-your-brain/)

## TikTok's anticipation engine

TikTok's specific innovation isn't the variable-reward schedule itself (X/Instagram already had
that) — it's that the schedule is personalized per-user faster and more precisely than any prior
platform, building what researchers describe as a "behavioral fingerprint" over hundreds of
sessions that predicts what will hold attention before the user consciously notices the pattern.
The unpredictability of *what's next* activates anticipation circuitry more strongly than the
video itself does — this is the same anticipation-over-outcome finding as the gambling research
below, applied to content instead of money.

Sources:
- [Why TikTok Keeps You Scrolling — Baylor University research](https://news.web.baylor.edu/news/story/2025/why-tiktok-keeps-you-scrolling-baylor-research-explains-science-behind-social-media)
- [The Behavioral Science Behind TikTok Addiction — Octalysis Group](https://octalysisgroup.com/2023/01/the-behavioral-science-behind-tiktok-addiction/)

## The neuroscience of a goal

When a fan's team scores, the brain's reward centers activate similarly to how they would if the
fan themself had achieved something — neuroimaging confirms limbic-region activation matching
personal-reward patterns, not just "watching something good happen." Crucially, this effect is
tied to *scarcity*: goals are emotionally enormous specifically because they're rare events
inside 90 minutes of largely unresolved tension, and irregular/intermittent rewards produce more
persistent reward-seeking behavior than frequent ones (the same operant-conditioning principle as
variable-ratio reinforcement above, occurring naturally in football rather than being engineered).

Highly invested fans also show measurable physiological stress during important matches —
elevated heart rate, blood pressure, and cortisol, with documented cardiovascular events during
major tournaments in extreme cases. Crowds amplify this: a stadium or viewing center becomes,
per the research, "a shared emotional system," not just a collection of individuals independently
reacting.

Sources:
- [Why Every Goal Feels Personal: The Neuroscience Behind the World Cup](https://afs.lambda-bio.com/blog/why-every-goal-feels-personal-the-neuroscience-behind-the-world-cup/)
- [Why stadiums make us emotional: The psychology of sports fandom — Eduwire](https://www.eduwire.lk/why-stadiums-make-us-emotional-the-psychology-of-sports-fandom/)
- [Rivalry Rewires the Brain: Why Fans Lose Control in an Instant — Neuroscience News](https://neurosciencenews.com/sport-fanatic-neuroscience-29924/)
- [The people's game: evolutionary perspectives on the behavioural neuroscience of football fandom — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11758463/)

## Gambling psychology (studied to avoid, not copy)

**Near-miss effect**: slot-machine outcomes are deliberately over-represented for "near-miss"
results (two matching symbols plus one adjacent-miss) far beyond what random chance would
produce, because a near-miss activates the ventral striatum — the brain's reward-processing
region — almost as strongly as an actual win, despite being an objective loss. Near-misses
measurably prolong how long people keep playing.

**Sunk-cost fallacy**: the irrational tendency to keep investing in a losing position because of
resources already spent, which cannot be recovered regardless of future action. In gambling
specifically, the urge to "win back" a loss overrides rational stopping, causing bettors to
increase stake size after losses — accelerating the loss rather than recovering it.

**Why people gamble at all despite negative expected value**: a mix of the thrill of genuine
uncertainty, hope of a large win, and the social dimension of participating alongside others —
combined with well-documented distorted beliefs (overestimating personal odds of winning) that
override rational expected-value calculation.

These three mechanisms are the actual playbook of predatory gambling design — the most-studied,
most potent compulsion mechanics that exist, worth knowing in full detail regardless of where
they end up applied.

Sources:
- [Gambling Near-Misses Enhance Motivation to Gamble and Recruit Win-Related Brain Circuitry — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2658737/)
- [Increased Urge to Gamble Following Near-Miss Outcomes — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5579302/)
- [Frontiers: unraveling the illusion of near-misses effect](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2024.1322631/full)
- [Why the House Always Wins: The Psychology and Math Behind Gambling](https://theluckybutton.com/blog/why-the-house-always-wins-the-psychology-and-math-behind-gambling/)

## The Hook Model — origin and its own built-in ethics check

Nir Eyal's 2014 *Hooked* describes a four-stage loop (trigger → action → variable reward →
investment) for building habit-forming products. The book is widely cited as the origin of
"addictive app design," but Eyal himself included an ethical framework alongside it — the
"Manipulation Matrix," which asks whether the product materially improves the user's life and
whether the builder would use it on themselves — and explicitly calls building a habit that
works against the user's own interest "exploitation," not good design. The well-documented
critique is that most teams that adopted the four-step loop for growth metrics skipped the
ethics chapter entirely, which is why the framework's real-world reputation is worse than its
author's stated intent. Eyal's 2019 follow-up, *Indistractable*, is explicitly about teaching
users to defend against the same mechanics the first book taught companies to build.

Sources:
- [How to create habit-forming products using the Hook Model — UX Collective](https://uxdesign.cc/how-to-create-habit-forming-products-using-the-hook-model-b9d6b1f58b89)
- [Hook Model: Why It Creates Addicts, Not Habits — Yu-kai Chou](https://yukaichou.com/gamification-analysis/hook-model-octalysis-habit-addiction/)
- [Understanding the Hook Model — Dovetail](https://dovetail.com/product-development/what-is-the-hook-model/)

## Ethical streaks: what Duolingo's data actually shows

Users who reach a 7-day streak are roughly 3.6x more likely to complete their course, and users
with a 7+ day streak are about 2.4x more likely to return the next day — loss aversion measurably
starts driving retention around the one-week mark, not immediately. The design lesson that's
easy to skip: ethical streak systems pair the loss-aversion pressure with genuine forgiveness
(streak freezes, repair mechanics) specifically so a single bad day doesn't erase weeks of
motivation and convert the mechanic into shame instead of momentum. The goal stated in the
better write-ups is to gradually shift reliance from the external streak pressure to intrinsic
satisfaction with the underlying activity, not to keep escalating the external hook forever.

Sources:
- [Duolingo — Streak System Detailed Breakdown & Design](https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f)
- [The Psychology of Hot Streak Game Design](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame)
- [Duolingo's Habit-Forming Reminders: A UX Breakdown](https://www.digia.tech/post/duolingo-habit-forming-reminders-retention-architecture/)

## Social identity theory and fandom

People categorize themselves into in-groups and out-groups as a core part of self-esteem and
belonging — sports fandom is one of the most-studied real-world applications of this. The
consistent finding across the literature: **in-group favoritism (rooting for your own side) is a
stronger and more widespread effect than out-group derogation (hating the rival)**. Fandom
activates reward pathways through identity formation and belonging specifically, not primarily
through opposition. This is directly relevant to Rivaly's naming and core mechanic — the product
is built on named rivalry between specific people, which is the stronger psychological lever
than an anonymous probability market.

Sources:
- [Social Identity Theory in Sports Fandom Research](https://www.researchgate.net/publication/340905856_Social_Identity_Theory_in_Sports_Fandom_Research)
- [Is social identity theory enough to cover sports fans' behavior? — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12188543/)
- [Psychology of Fandom: Exploring the Mind Behind Fan Culture](https://neurolaunch.com/psychology-of-fandom/)

## Cognitive biases in product design (general reference)

- **Loss aversion** — losing something feels worse than gaining the equivalent feels good;
  ethical use requires the "loss" being framed to be real (an actual streak, actual escrowed
  funds), never an invented one.
- **FOMO** — the discomfort of missing what others are experiencing; only honest when the
  excluded thing is real and genuinely time-bound.
- **Social proof** — most effective when the proof is specific and comes from someone similar to
  the viewer, not a large anonymous number.
- **Endowment effect** — people value something more once they feel ownership over it, even
  before formally acquiring it; free trials and partial completion states lean on this
  naturally, without needing to be manufactured.

Sources:
- [Cognitive Bias in UX: Designing with Psychology — Designlab](https://designlab.com/blog/ux-psychology)
- [Cognitive Biases and how to leverage them in Product Design](https://medium.com/@adityatells/cognitive-biases-and-how-to-leverage-them-in-product-design-d1d2da770147)
- [Understanding Cognitive Bias in Product Design — Toptal](https://www.toptal.com/designers/ux/cognitive-bias-product-design)

## SportyBet — what actually drove growth

Contrary to the "aggressive behavioral engineering" assumption, the documented growth drivers
are: building mobile-first specifically for African connectivity and device constraints (rather
than translating a European product), low minimum stakes accessible to the actual local market,
fast local payment rail integration, and regular (real) promotions rather than manufactured
urgency. SportyBet's own traffic is concentrated in Nigeria (~63%), Ghana, and Tanzania, and its
credibility partnerships (Real Madrid, Mastercard) reinforced trust rather than manipulated it.
The lesson for Rivaly: the winning move for this market has repeatedly been *removing friction
for underserved mobile users*, not adding psychological hooks.

Sources:
- [5 Marketing strategies for the Nigerian Betting companies — LinkedIn](https://www.linkedin.com/pulse/5-marketing-strategies-nigerian-betting-companies-araoluwa-ogundairo)
- [SportyBet Nigeria: Ownership and Background Explained](https://betpawa-app.com/articles/sportybet-nigeria-ownership-background/)
