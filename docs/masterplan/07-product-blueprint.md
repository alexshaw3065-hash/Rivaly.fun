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

## 4.13 Following

Feed: New Rooms · Friends Online · Challenges · Big Wins · Posts (future)

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

Streaming · Tournaments · Voice Rooms · Creator Monetization · Communities · Fantasy · AI Copilot

### V2 Ideas (post-V1, not now)

Streaming · Voice rooms · Tournaments · Communities · AI summaries · Creator monetization · Reputation levels · Fantasy integrations
