import Link from "next/link";
import { CompanyPage, DocList, DocSection, PlainSummary } from "@/components/company/company-page";
import { COMPANY, POLICY_DATES, formatPolicyDate, mailto } from "@/lib/company";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Terms of Use",
  description:
    "The terms for using Rivaly: who can play, how rooms, stakes, escrow and settlement work, fees and host earnings, fair play, and what happens if something goes wrong.",
  path: "/terms",
});

// The Terms describe what the product actually does — every mechanic here is
// checked against the code (settlement: lib/settlement; fees: planSettlement;
// refunds; host claims; the beta's test USDC). When the product changes, this
// changes, and POLICY_DATES.terms moves. Have a lawyer review before mainnet
// and set COMPANY.entity / governingLaw once Rivaly is incorporated.

const TOC = [
  { id: "agreement", label: "These terms" },
  { id: "eligibility", label: "Who can use Rivaly" },
  { id: "account", label: "Your account" },
  { id: "beta", label: "The beta and test funds" },
  { id: "wallet", label: "Your wallet" },
  { id: "rooms", label: "Rooms and predictions" },
  { id: "stakes", label: "Stakes and escrow" },
  { id: "settlement", label: "How rooms settle" },
  { id: "refunds", label: "Refunds" },
  { id: "fees", label: "Fees" },
  { id: "hosting", label: "Hosting and host earnings" },
  { id: "fair-play", label: "Fair play" },
  { id: "community", label: "Chat, posts and conduct" },
  { id: "suspension", label: "Suspension and closing your account" },
  { id: "ip", label: "Rivaly, clubs and leagues" },
  { id: "third-parties", label: "Services we rely on" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limits on liability" },
  { id: "disputes", label: "Disputes" },
  { id: "changes", label: "Changes to these terms" },
  { id: "contact", label: "Contact" },
];

const n = (id: string) => TOC.findIndex((t) => t.id === id) + 1;

export default function TermsPage() {
  const effective = formatPolicyDate(POLICY_DATES.terms);
  return (
    <CompanyPage
      active="/terms"
      title="Terms of Use"
      lede="The agreement between you and Rivaly when you use the app: what we do, what we ask of you, and what happens when things go wrong."
      meta={
        <>
          Effective <time dateTime={POLICY_DATES.terms}>{effective}</time>
        </>
      }
      toc={TOC}
      contactLine="Questions about these terms?"
    >
      <PlainSummary
        items={[
          { text: "You must be 18 or older, and it must be legal for you to use Rivaly where you are.", href: "#eligibility" },
          { text: "You play other people, never Rivaly. We hold the pool, check the result and pay the winners.", href: "#rooms" },
          { text: "Once your stake is in a room it stays there until the room settles. There's no cashing out early.", href: "#stakes" },
          { text: "Rooms settle on official match data. If a match is called off or nobody takes the other side, everyone is refunded in full.", href: "#settlement" },
          { text: "Any fee is a share of the winners' profit, never of a stake, and it's shown before you play.", href: "#fees" },
          { text: "During the beta, balances are test USDC with no cash value.", href: "#beta" },
        ]}
        note="This summary is here to help. The full terms below are what apply."
      />

      <DocSection id="agreement" n={n("agreement")} title="These terms">
        <p>
          These Terms of Use (&ldquo;terms&rdquo;) are an agreement between you and {COMPANY.name} (&ldquo;Rivaly&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) covering your use of the Rivaly app and website at {COMPANY.site} (together, &ldquo;Rivaly&rdquo; or the
          &ldquo;service&rdquo;). By creating an account or using Rivaly, you agree to them. If you don&rsquo;t agree, please don&rsquo;t use
          Rivaly.
        </p>
        <p>
          Our <Link href="/privacy">Privacy Policy</Link> explains how we handle your information, and our{" "}
          <Link href="/responsible-play">Responsible play</Link> page explains how we try to keep Rivaly fun. Both are part of how we run the
          service.
        </p>
      </DocSection>

      <DocSection id="eligibility" n={n("eligibility")} title="Who can use Rivaly">
        <p>To use Rivaly you must:</p>
        <DocList
          items={[
            <>be at least 18 years old, or older if the law where you live sets a higher age for this kind of activity;</>,
            <>be able to enter into a binding agreement;</>,
            <>be somewhere where using Rivaly is legal — it&rsquo;s your responsibility to check the laws that apply to you;</>,
            <>not be barred from using Rivaly by sanctions or by any law, and not be using Rivaly on behalf of someone who is.</>,
          ]}
        />
        <p>
          We may ask you to confirm your age or identity, and we may limit or close access in places, or for people, where we believe the
          service can&rsquo;t lawfully be offered.
        </p>
      </DocSection>

      <DocSection id="account" n={n("account")} title="Your account">
        <p>
          You sign in with your email or a supported social login; we use a sign-in provider to do this securely. One person may hold one
          account, and an account is for its owner only — don&rsquo;t share it, sell it or let anyone else use it.
        </p>
        <p>
          Your username and profile are public. Don&rsquo;t choose a username that impersonates someone, misleads people, or is offensive; we
          may change or reclaim usernames that do. Keep your sign-in method secure and tell us straight away at{" "}
          <a href={mailto("Account security")}>{COMPANY.email}</a> if you think someone else has accessed your account.
        </p>
      </DocSection>

      <DocSection id="beta" n={n("beta")} title="The beta and test funds">
        <p>
          Rivaly is in beta. While it is, balances, stakes, payouts and host earnings are in <strong>test USDC on the Solana devnet</strong>.
          Test USDC has no monetary value: it can&rsquo;t be bought, sold, or exchanged for money or anything else, and nothing you win
          during the beta is a prize of value.
        </p>
        <p>
          New accounts may receive a starting balance of test USDC to try Rivaly. Because this is a test network, balances may be reset,
          features may change or be withdrawn, and things may occasionally go wrong. We&rsquo;ll tell you in the app before real-money play
          begins, and these terms will be updated for it.
        </p>
      </DocSection>

      <DocSection id="wallet" n={n("wallet")} title="Your wallet">
        <p>
          When you sign up, a wallet on the Solana network is created for you through our wallet provider. Your balance is held in USDC, a
          dollar-denominated stablecoin. Your Wallet screen shows what&rsquo;s available, what&rsquo;s staked in live rooms, and your history.
        </p>
        <DocList
          items={[
            <>Rivaly doesn&rsquo;t lend, invest or otherwise use your balance.</>,
            <>
              Withdrawals go to the Solana address you enter. Blockchain transfers can&rsquo;t be reversed, so check the address — we
              can&rsquo;t recover funds sent to the wrong one.
            </>,
            <>
              Rivaly charges nothing to deposit or withdraw. The Solana network charges a small fee on withdrawals, paid from your wallet;
              we pay the network fee when you stake.
            </>,
            <>Rivaly is not a bank. Balances are not deposits and are not covered by any deposit-protection scheme.</>,
          ]}
        />
      </DocSection>

      <DocSection id="rooms" n={n("rooms")} title="Rooms and predictions">
        <p>
          A room is a prediction on a real match — for example &ldquo;Arsenal win&rdquo; or &ldquo;over 2.5 goals&rdquo; — that people back
          (YES) or oppose (NO) by staking into the room&rsquo;s pool. Whoever creates the room is its host. Before anyone can join, the room
          shows the prediction, the match, the stake limits and the fee.
        </p>
        <p>
          <strong>Rivaly is never a party to a room.</strong> We don&rsquo;t set odds, take a side, or profit from anyone losing. The pool is
          made up only of the stakes of the people in it, and it is paid out only to them.
        </p>
        <p>
          We may refuse, hide or close a room that is unclear, misleading, offensive, on an event we can&rsquo;t settle reliably, or that
          breaks these terms. If we close a room before it settles, every stake in it is refunded in full.
        </p>
      </DocSection>

      <DocSection id="stakes" n={n("stakes")} title="Stakes and escrow">
        <p>
          When you join a room, your stake leaves your wallet and is held in escrow — either in Rivaly&rsquo;s escrow wallet or in
          Rivaly&rsquo;s program on the Solana network, as shown for that room — until the room settles or is refunded.
        </p>
        <p>
          A stake is committed once it&rsquo;s confirmed. You can&rsquo;t withdraw it, cancel it or cash it out early: everyone on the other
          side staked on the same footing, and that is what keeps the pool fair. Stakes must be within the room&rsquo;s limits and any limits
          we set across Rivaly.
        </p>
      </DocSection>

      <DocSection id="settlement" n={n("settlement")} title="How rooms settle">
        <p>
          Rooms settle on official match data from the sports-data providers we use, applied to the prediction exactly as written on the room.
          A room settles once its result is certain — which can be before the final whistle — after a short safety window for things like VAR.
          Where the data can&rsquo;t settle a room automatically, our team settles it by hand from the same official data.
        </p>
        <p>
          The winning side shares the whole pool, less any fee, in proportion to what each person staked. Winnings are paid to your wallet
          automatically; there&rsquo;s nothing to claim.
        </p>
        <p>
          Settlement is final. If we find that a room was settled on clearly wrong data, or because of an error in our systems, we&rsquo;ll
          tell the people in that room and put it right where we reasonably can.
        </p>
      </DocSection>

      <DocSection id="refunds" n={n("refunds")} title="Refunds">
        <p>Everyone in a room gets their full stake back, with no fee, if:</p>
        <DocList
          items={[
            <>nobody takes one of the sides by the time the room closes;</>,
            <>the match is postponed, cancelled or abandoned;</>,
            <>the prediction can&rsquo;t be fairly decided from the data — for example if the data needed isn&rsquo;t available; or</>,
            <>we close the room before it settles.</>,
          ]}
        />
      </DocSection>

      <DocSection id="fees" n={n("fees")} title="Fees">
        <p>
          When a room has a fee, it is a percentage of the <strong>winners&rsquo; profit</strong> — the money they win from the other side —
          never of anyone&rsquo;s stake. Our standard fee is 5% of that profit: 3% to Rivaly and 2% to the room&rsquo;s host.
        </p>
        <DocList
          items={[
            <>A room&rsquo;s fee is fixed when the room is created and shown before you stake. A room that shows no fee charges none.</>,
            <>People on the losing side never pay more than their stake.</>,
            <>Refunded rooms pay no fee.</>,
            <>Your results and receipts show the fee taken.</>,
          ]}
        />
        <p>If we change our standard fee, the change applies only to rooms created afterwards.</p>
      </DocSection>

      <DocSection id="hosting" n={n("hosting")} title="Hosting and host earnings">
        <p>
          A room&rsquo;s host earns the host share of its fee when it settles, whichever side wins. Host earnings build up as one balance —
          pending while your rooms are live, claimable once they settle — and are claimed in a single transfer once they reach the minimum shown
          in your Wallet. Host earnings are private unless you choose to show them on your profile.
        </p>
        <p>
          Hosts must not mislead people about a room, offer anything outside Rivaly in return for joining, or host rooms they are barred from
          predicting on (see <a href="#fair-play">Fair play</a>). We may withhold host earnings from rooms that break these terms.
        </p>
      </DocSection>

      <DocSection id="fair-play" n={n("fair-play")} title="Fair play">
        <p>Rivaly only works if every room is a fair contest between real people. You must not:</p>
        <DocList
          items={[
            <>
              predict on, or host, a match you can influence or have inside information about — including as a player, coach, official,
              club or league staff, agent, or anyone close to them;
            </>,
            <>try to fix, manipulate or affect the outcome of any match or event;</>,
            <>hold more than one account, or work with other accounts to take both sides, move money, or rig a room;</>,
            <>use bots, scripts or automation to create accounts, stake, or post;</>,
            <>exploit a bug or error instead of reporting it to us;</>,
            <>use Rivaly to launder money, finance anything illegal, or move funds that aren&rsquo;t yours.</>,
          ]}
        />
        <p>
          If we reasonably believe a room or account has been affected by any of these, we may void the affected stakes, hold funds while we
          look into it, and suspend or close the accounts involved. Where the law requires, we will report it to the relevant authorities.
        </p>
      </DocSection>

      <DocSection id="community" n={n("community")} title="Chat, posts and conduct">
        <p>
          Room chat, Arena posts, replies, photos and GIFs are how Rivaly feels like watching with friends. You keep ownership of what you
          post, and you give us a worldwide, non-exclusive, royalty-free licence to host, show and share it as part of running and promoting
          Rivaly (for example, a room&rsquo;s share image). Content in public rooms and the Arena is public.
        </p>
        <p>Banter is welcome. These aren&rsquo;t:</p>
        <DocList
          items={[
            <>harassment, threats, hate, or targeting someone for who they are;</>,
            <>sharing someone&rsquo;s private information;</>,
            <>spam, scams, or advertising other betting or gambling services;</>,
            <>sexual content, or anything illegal or that you don&rsquo;t have the right to share.</>,
          ]}
        />
        <p>
          You can report a message or post from the app. We may remove content and limit or suspend accounts that break these rules. We
          don&rsquo;t review everything before it appears and aren&rsquo;t responsible for what other people post.
        </p>
      </DocSection>

      <DocSection id="suspension" n={n("suspension")} title="Suspension and closing your account">
        <p>
          We may suspend or close an account that breaks these terms, that we&rsquo;re required to restrict by law, or where we need to
          protect other people or Rivaly. Where we can, we&rsquo;ll tell you why. Stakes in live rooms stay in those rooms and settle normally
          unless they&rsquo;re affected by the reason for the suspension.
        </p>
        <p>
          You can close your account at any time by emailing <a href={mailto("Close my account")}>{COMPANY.email}</a>. Withdraw your available
          balance first; stakes already in live rooms settle as normal. Some records — for example of transactions — we must keep, and
          transactions on the blockchain can&rsquo;t be deleted (see our <Link href="/privacy">Privacy Policy</Link>).
        </p>
      </DocSection>

      <DocSection id="ip" n={n("ip")} title="Rivaly, clubs and leagues">
        <p>
          The Rivaly name, logo, app and design belong to Rivaly. You may share links, screenshots and share images from Rivaly, but not copy
          the service or use our brand in a way that suggests we endorse you.
        </p>
        <p>
          Team and league names and badges belong to their owners and are used only to identify teams and competitions. Badges are sourced from{" "}
          <a href="https://www.thesportsdb.com" target="_blank" rel="noopener noreferrer">
            TheSportsDB
          </a>
          . Rivaly is not affiliated with, sponsored or endorsed by any club, league, player or governing body.
        </p>
      </DocSection>

      <DocSection id="third-parties" n={n("third-parties")} title="Services we rely on">
        <p>
          Rivaly depends on other services, including our sign-in and wallet provider, the Solana network, and sports-data providers. We choose
          them carefully, but we don&rsquo;t control them. If one of them is unavailable or makes an error, rooms may be delayed, settled on
          corrected data, or refunded as these terms describe.
        </p>
      </DocSection>

      <DocSection id="disclaimers" n={n("disclaimers")} title="Disclaimers">
        <p>
          Rivaly is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, and during the beta especially it may be interrupted, change
          or contain errors. To the extent the law allows, we make no promises beyond those in these terms — for example that the service
          will always be available or error-free.
        </p>
        <p>
          Nothing on Rivaly — including other people&rsquo;s predictions, posts, stats or leaderboards — is advice of any kind. Decide for
          yourself, and only stake what you&rsquo;re happy to lose.
        </p>
      </DocSection>

      <DocSection id="liability" n={n("liability")} title="Limits on liability">
        <p>
          To the extent the law allows, Rivaly is not liable for indirect or consequential losses, lost profits, or losses caused by things
          outside our reasonable control — such as outages of networks or providers we rely on, or errors in official match data. Our total
          liability to you for any claim is limited to the amount you staked in the room, or the transaction, that the claim is about.
        </p>
        <p>
          Nothing in these terms limits liability that can&rsquo;t be limited by law, such as for fraud, or for death or personal injury
          caused by negligence, or removes rights you have as a consumer that can&rsquo;t be waived.
        </p>
      </DocSection>

      <DocSection id="disputes" n={n("disputes")} title="Disputes">
        <p>
          If something&rsquo;s gone wrong, email <a href={mailto("Dispute")}>{COMPANY.email}</a> with your username and the room or
          transaction involved. We&rsquo;ll look into it and reply, and most things can be put right this way.
        </p>
        {COMPANY.entity && COMPANY.governingLaw && (
          <p>
            These terms are between you and {COMPANY.entity} and are governed by the laws of {COMPANY.governingLaw}, without affecting any
            mandatory consumer protections of the place where you live.
          </p>
        )}
      </DocSection>

      <DocSection id="changes" n={n("changes")} title="Changes to these terms">
        <p>
          We&rsquo;ll update these terms as Rivaly changes — most notably before real-money play begins. When a change is material, we&rsquo;ll
          tell you in the app before it takes effect. The date at the top of this page shows when they last changed; continuing to use Rivaly
          after a change means you accept it.
        </p>
        <p className="text-caption text-tertiary">
          {effective}: rewritten in full — eligibility, the beta, wallets, settlement, refunds, fees, hosting, fair play and conduct.
        </p>
      </DocSection>

      <DocSection id="contact" n={n("contact")} title="Contact">
        <p>
          Email <a href={mailto()}>{COMPANY.email}</a>. For help using Rivaly, see <Link href="/support">Support</Link>.
        </p>
      </DocSection>
    </CompanyPage>
  );
}
