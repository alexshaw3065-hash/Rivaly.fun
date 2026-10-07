import Link from "next/link";
import { CompanyPage, DocList, DocSection } from "@/components/company/company-page";
import { COMPANY, POLICY_DATES, formatPolicyDate, mailto } from "@/lib/company";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Responsible play",
  description:
    "How Rivaly is built to keep predicting sport fun: no house edge, the most you can lose is your stake, breaks and self-exclusion on request, warning signs, and where to get free, confidential help.",
  path: "/responsible-play",
});

// The counterweight to everything in the engagement-psychology skill: the
// mechanisms Rivaly deliberately doesn't point at money (near-miss, loss-
// chasing, bonuses) are named here as promises. Breaks and self-exclusion run
// on the admin suspension today (profiles.suspended_until / banned_at block
// staking, room creation, chat and posts — rooms/actions.ts, is_restricted);
// self-serve limits and breaks in Settings come before real-money play. Keep
// every promise here true of the product.

const TOC = [
  { id: "built", label: "How Rivaly is built" },
  { id: "keep-it-fun", label: "Keeping it fun" },
  { id: "signs", label: "Signs it's stopped being fun" },
  { id: "break", label: "Take a break or stop" },
  { id: "help", label: "Free, confidential help" },
  { id: "under-18", label: "Under 18s" },
];

const HELP: { name: string; what: string; href: string; contact?: string }[] = [
  {
    name: "Gambling Therapy",
    what: "Free support worldwide, in many languages — live chat, forums and groups.",
    href: "https://www.gamblingtherapy.org",
  },
  {
    name: "Gamblers Anonymous",
    what: "Peer support meetings in person and online, in many countries.",
    href: "https://www.gamblersanonymous.org",
  },
  {
    name: "GamCare — National Gambling Helpline (UK)",
    what: "Free advice, 24 hours a day.",
    href: "https://www.gamcare.org.uk",
    contact: "0808 8020 133",
  },
  {
    name: "National Council on Problem Gambling (US)",
    what: "Free, confidential helpline, 24 hours a day.",
    href: "https://www.ncpgambling.org",
    contact: "1-800-GAMBLER",
  },
  {
    name: "BetBlocker",
    what: "Free app that blocks gambling and betting sites on your devices.",
    href: "https://betblocker.org",
  },
];

export default function ResponsiblePlayPage() {
  return (
    <CompanyPage
      active="/responsible-play"
      title="Responsible play"
      lede="Rivaly is for the fun of calling a match against people you know. Here's how we keep it that way, how to tell when it isn't, and where to get help."
      meta={
        <>
          Updated <time dateTime={POLICY_DATES.responsiblePlay}>{formatPolicyDate(POLICY_DATES.responsiblePlay)}</time>
        </>
      }
      toc={TOC}
      contactLine="Want a break, or worried about someone?"
    >
      <DocSection id="built" n={1} title="How Rivaly is built">
        <p>A lot of betting products are designed to keep you playing after it stops being fun. We&rsquo;ve made different choices:</p>
        <DocList
          items={[
            <>
              <strong>We never win when you lose.</strong> You play other people, not Rivaly. Our only income from rooms is a share of the
              winners&rsquo; profit, so we have no reason to want anyone to lose.
            </>,
            <>
              <strong>The most you can lose is your stake</strong> — you see it before you join, and nothing is ever taken beyond it.
            </>,
            <>
              <strong>No bonuses to chase.</strong> No odds boosts, no &ldquo;bet again to win it back&rdquo; offers, no free bets that need
              wagering.
            </>,
            <>
              <strong>No cash-out, no in-play betting.</strong> Stakes close at kickoff. After that there&rsquo;s nothing to buy or sell
              — just the match and the people you&rsquo;re watching it with.
            </>,
            <>
              <strong>No nudges outside the app.</strong> We don&rsquo;t send emails or push notifications telling you to play.
            </>,
            <>
              <strong>18+ only</strong>, and during the beta every balance is test USDC with no cash value.
            </>,
          ]}
        />
      </DocSection>

      <DocSection id="keep-it-fun" n={2} title="Keeping it fun">
        <DocList
          items={[
            <>Decide what you&rsquo;re happy to spend before matchday, and stick to it — think of it like a ticket or a round of drinks.</>,
            <>Only stake money you can afford to lose. Never borrow, and never use money meant for rent, bills or food.</>,
            <>Don&rsquo;t chase a loss. A bigger stake to win it back is how small losses become big ones.</>,
            <>Keep it social. Rivaly is at its best with friends; staking alone, late at night, is a different thing.</>,
            <>Don&rsquo;t play when you&rsquo;re upset, stressed or have been drinking.</>,
            <>Take breaks, and keep plenty of football that has nothing riding on it.</>,
          ]}
        />
      </DocSection>

      <DocSection id="signs" n={3} title="Signs it's stopped being fun">
        <p>Be honest with yourself. It may be time to stop, or to talk to someone, if you:</p>
        <DocList
          items={[
            <>spend more than you planned, or more than you can afford;</>,
            <>raise your stakes to win back what you&rsquo;ve lost;</>,
            <>borrow money, or sell things, to stake;</>,
            <>hide how much you&rsquo;re playing from the people close to you;</>,
            <>feel anxious, low or irritable when you aren&rsquo;t playing, or when you try to cut down;</>,
            <>find it&rsquo;s affecting your sleep, work, studies or relationships.</>,
          ]}
        />
        <p>None of these make you a bad person. They&rsquo;re common, and help works.</p>
      </DocSection>

      <DocSection id="break" n={4} title="Take a break or stop">
        <p>
          <strong>Take a break.</strong> Email <a href={mailto("Take a break")}>{COMPANY.email}</a> from your account&rsquo;s email address,
          with how long you want — a day, a week, a month or longer. We&rsquo;ll stop your account from staking, creating rooms and posting
          for that time. Rooms you&rsquo;re already in settle normally and winnings still reach your wallet. Once a break starts, we won&rsquo;t
          end it early, even if you ask.
        </p>
        <p>
          <strong>Stop for good.</strong> Ask us to self-exclude you and we&rsquo;ll close your account for at least six months, or
          permanently if you prefer. You can still withdraw your balance.
        </p>
        <p>
          Self-serve limits and breaks in Settings are coming before real-money play begins. To block betting sites across all your devices
          as well, try <a href="https://betblocker.org" target="_blank" rel="noopener noreferrer">BetBlocker</a> (free).
        </p>
      </DocSection>

      <DocSection id="help" n={5} title="Free, confidential help">
        <p>Talking to someone helps. These services are free, confidential and don&rsquo;t judge:</p>
        <ul className="flex flex-col">
          {HELP.map((h) => (
            <li key={h.name} className="border-t border-line py-4 first:border-0 first:pt-1">
              <a href={h.href} target="_blank" rel="noopener noreferrer" className="font-semibold">
                {h.name}
              </a>
              <p className="mt-1">{h.what}</p>
              {h.contact && <p className="mt-1 tabular-nums text-foreground">{h.contact}</p>}
            </li>
          ))}
        </ul>
        <p>If you&rsquo;re in crisis or thinking about harming yourself, call your local emergency number now.</p>
      </DocSection>

      <DocSection id="under-18" n={6} title="Under 18s">
        <p>
          Rivaly is strictly for people aged 18 and over (see our <Link href="/terms#eligibility">Terms</Link>). If you think someone under 18
          is using Rivaly, tell us at <a href={mailto("Underage account")}>{COMPANY.email}</a> and we&rsquo;ll close the account. Parents can
          use their device&rsquo;s parental controls, or BetBlocker, to block sites like ours.
        </p>
      </DocSection>
    </CompanyPage>
  );
}
