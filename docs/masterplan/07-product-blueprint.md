# Chapter 4 — Product Blueprint

Every screen. Every button. Every interaction. Every state. This is the document every designer and engineer works from. If someone who had never heard of Rivaly read just this chapter, they should be able to design every screen and engineer every interaction without asking what happens next. That's the standard to aim for.

> **Note:** This chapter is a full-surface-area catalog for the mature product. For what actually ships first, see [08-v1-scope.md](08-v1-scope.md) — build only what's listed there until it's proven.

## 4.1 Design Philosophy

Before a single screen, the philosophy:
- Football first. Money second. Crypto third.
- Every screen should increase excitement.
- Every action should be possible in under three clicks.
- Never make users think about blockchain.
- Design for rivalry.
- Design for anticipation.
- Design for rematches.

## 4.2 Navigation (complete sitemap)

Home · Live Matches · Rooms · Create Room · Search · Inbox · Notifications · Wallet · Profile · Leaderboard · Settings

Every screen links to another.

## 4.3 Home

**Purpose:** everything visible at a glance.

**Sections:** Hero Match · Live Matches · Trending Rooms · Friends Playing · Following · Big Wins · Creator Rooms · Weekend Highlights

## 4.4 Live Matches

**Filters:** Search · Competition selector · Kickoff time · Score · Live indicator

**Actions:** Join Room · Create Room

## 4.5 Room

Header · Prediction cards · Pool · Participants · Chat · Timeline · Share · Invite · Leave · Pinned messages · Room Rules · Creator · Moderation · Match Finished · Settlement · Rematch

## 4.6 Create Room

**Fields:** Prediction · Entry amount · Visibility (Private / Public) · Invite Link · Match · Settlement · Preview · Create

**After Create:** Share Flow

## 4.7 Profile

Biography · Followers · Following · Rooms Created · Prediction Accuracy · Total Winnings · Reputation · Achievements · Badges · History · Challenge Button · Follow Button · Share Profile

## 4.8 Wallet

Often overlooked, but critical: Balance · Deposit · Withdraw · Pending · Transaction History · Fees · Escrow · Current Rooms · Completed Rooms

## 4.9 Inbox

Messages · Challenges · Friend Requests · Room Invites · Creator Announcements · Settlement Notices · System Messages · Search · Mark Read · Archive

## 4.10 Notifications

Friend joined · Challenge received · Goal scored · Whale entered · Room filled · Settlement complete · Someone followed you · Creator went live (future)

## 4.11 Search

**Scope:** People · Rooms · Matches · Creators · Competitions · Predictions

**Sections:** Recent · Trending · Filters

## 4.12 Leaderboard

Global · Friends · Weekly · Monthly · Creators · Most Accurate · Highest Earnings · Biggest Upsets

## 4.13 Arena (2026-08-20 revision, formerly "Following")

The fourth nav tab — Rivaly's social/engagement hub, built around the
psychology of what actually brings people back daily without tipping into
addictive dark patterns (see the Arena implementation plan for the full
research citations). One hard rule governs every number shown here: it must
trace back to a real field (a real entry, a real participant count, a real
follow relationship) — never a fabricated count invented to look more
urgent than it is.

**Feed** — Global (everyone) / Following (people you follow) toggle over an
infinite-scrolling, real-stopping-point feed (same IntersectionObserver +
closing-moment pattern as Home/Rooms' RoomFeed, not a bottomless loop).
Content types, mixed for variety rather than shown as separate sections:
win/loss receipt cards (real PnL), hot-room alerts (real momentum data),
rival activity (a followed profile's live entry), and banter/thesis posts
(short text, roast replies, a thesis post can attach to a real room).

**Leagues** — points-only, FPL-style: standings, a weekly "gameweek" points
delta alongside season points, joined by invite code (same pattern as
private rooms). No entry fee, no prize pool — see
[08-v1-scope.md §7](08-v1-scope.md) for why this is explicitly a different
thing from "Tournaments."

**Leaderboard** — the full ranked board, filterable by Global (P/L) / This
Gameweek / Most Accurate / Highest Earnings — a superset view of what
Home's "Top rivals" teases in miniature.

**Online rivals badge** — a real, honest count + avatar stack, tappable to
see who; shown in Arena's header.

## 4.14 Settings

Account · Privacy · Notifications · Wallet · Language · Appearance · Security · Blocked Users · Delete Account

## 4.15 Components (reusable)

Prediction Card · Room Card · Chat Bubble · Scoreboard · Buttons · Tabs · Avatar · Pool Bar · Progress Bar · Follow Button · Challenge Button · Notification Card · Modal · Toast · Bottom Sheet · Loading State · Skeleton · Dropdown

## 4.16 Empty States

No rooms · No followers · No challenges · No balance · No notifications · No matches · No search results

## 4.17 Loading States

Skeletons · Animations · Spinners

## 4.18 Error States

Wallet failed · Room full · Prediction closed · Settlement delayed · Connection lost · API failed

## 4.19 Success States

Deposit complete · Room created · Challenge accepted · Prediction won · Friend followed

## 4.20 Microinteractions

Hover · Press · Goal · Win · Lose · Challenge · Copy Link · Follow · Invite · Share · Rematch

## 4.21 Animations

Exactly when, duration, ease, speed, confetti, haptics — see [06-emotion-design.md](06-emotion-design.md) for the emotional rules governing these.

## 4.22 Accessibility

Keyboard · Contrast · Font sizes · Screen readers · Reduced motion

## 4.23 Responsive Design

Desktop · Tablet · Mobile · Large Desktop

## 4.24 Edge Cases

Creator leaves · Nobody joins · Match postponed · Cancelled · Refund · Duplicate Room · Network offline

## 4.25 Future Components (Not V1)

Streaming · Money-entry Tournaments · Voice Rooms · Creator Monetization ·
Communities · Tribes/Clans (see below) · AI Copilot

### V2 Ideas (post-V1, not now)

Streaming · Voice rooms · Money-entry Tournaments (Arena's Leagues are
points-only and already shipped — see [08-v1-scope.md §7](08-v1-scope.md))
· Communities · AI summaries · Creator monetization · Reputation levels

### Tribes/Clans — the fuller vision (2026-08-20, captured for V2 so it
isn't lost)

Scoped out of the Arena pass explicitly (founder's call — "leave it for
version 2"), but the vision is more specific than a generic group feature,
closer to FOMO app's Clans than a simple community:

- **One-tap trade mirroring** — a clan/tribe member's room entry appears as
  a live card in the tribe's feed; tapping it takes you straight into that
  same room to enter yourself. Manual confirmation, not automatic
  copy-trading — no money moves without you tapping to confirm it (keeps
  "trust must be visible" intact).
- **A "thesis" tab** — before following someone into a room, you can see
  their reasoning and their verified track record (real prediction
  accuracy/P&L), not just the pick itself.
- **Built around top predictors, not just friend groups** — the framing the
  founder gave: "imagine a tribe of top whales making money and small
  people can look at the rooms they're entering and also enter." Closer to
  a creator-led following than a peer group chat.
- **Shared audience-building** — tribes compound visibility/leaderboard
  presence together, not just shared chat.
