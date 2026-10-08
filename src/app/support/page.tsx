import Link from "next/link";
import type { ReactNode } from "react";
import { CompanyPage } from "@/components/company/company-page";
import { SupportFaq, SupportSearch } from "@/components/company/support-faq";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonClasses } from "@/components/ui/button";
import { pageMeta } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const metadata = pageMeta({
  title: "Support",
  description:
    "Get help with Rivaly: your account, wallet, deposits and withdrawals, how rooms settle, refunds, fees, host earnings, reporting someone, and taking a break.",
  path: "/support",
});

// Real answers about how the product works today, grouped by what people
// actually come here with — and a real inbox at the top. Every answer must
// stay true of what's shipped (same facts as /docs and /terms).

type Faq = { q: string; a: ReactNode; text: string };

const faq = (q: string, a: ReactNode, text: string): Faq => ({ q, a, text });

const TOPICS: { id: string; title: string; items: Faq[] }[] = [
  {
    id: "account",
    title: "Account and sign-in",
    items: [
      faq(
        "How do I sign in?",
        <>With your email or Google. A wallet is created for you in the background — no crypto app, seed phrase or setup needed.</>,
        "With your email or Google. A wallet is created for you in the background — no crypto app, seed phrase or setup needed.",
      ),
      faq(
        "Can I change my username?",
        <>
          Not from the app yet. Email us from your account&rsquo;s email address with the name you&rsquo;d like and we&rsquo;ll change it if
          it&rsquo;s free.
        </>,
        "Not from the app yet. Email us from your account's email address with the name you'd like and we'll change it if it's free.",
      ),
      faq(
        "How do I close my account?",
        <>
          Withdraw your balance, then email us from your account&rsquo;s email address. Rooms you&rsquo;re already in settle as normal.
        </>,
        "Withdraw your balance, then email us from your account's email address. Rooms you're already in settle as normal.",
      ),
    ],
  },
  {
    id: "wallet",
    title: "Wallet, deposits and withdrawals",
    items: [
      faq(
        "Where's my money?",
        <>Your Wallet shows what&rsquo;s available, what&rsquo;s staked in live rooms, and every deposit, stake, payout and withdrawal.</>,
        "Your Wallet shows what's available, what's staked in live rooms, and every deposit, stake, payout and withdrawal.",
      ),
      faq(
        "Is it real money?",
        <>
          Not yet. Rivaly is in beta: balances are test USDC on the Solana devnet with no cash value, and new accounts start with a little to
          play with.
        </>,
        "Not yet. Rivaly is in beta: balances are test USDC on the Solana devnet with no cash value, and new accounts start with a little to play with.",
      ),
      faq(
        "How do I add funds?",
        <>
          Open Wallet and tap Deposit. You&rsquo;ll see your Solana address and a QR code; send USDC on the Solana network to it. Anything
          else, or USDC on another network, won&rsquo;t arrive.
        </>,
        "Open Wallet and tap Deposit. You'll see your Solana address and a QR code; send USDC on the Solana network to it. Anything else, or USDC on another network, won't arrive.",
      ),
      faq(
        "How do I withdraw?",
        <>
          Open Wallet, tap Withdraw and enter a Solana address. Rivaly charges nothing, but the Solana network charges a tiny fee in SOL from
          your wallet — if it has none, the app tells you to add a little first. Blockchain transfers can&rsquo;t be reversed, so check the
          address.
        </>,
        "Open Wallet, tap Withdraw and enter a Solana address. Rivaly charges nothing, but the Solana network charges a tiny fee in SOL from your wallet. Blockchain transfers can't be reversed, so check the address.",
      ),
    ],
  },
  {
    id: "rooms",
    title: "Rooms, results and refunds",
    items: [
      faq(
        "How does a room settle?",
        <>
          Automatically, on official match data, against the prediction exactly as written on the room. It settles as soon as the result is
          certain — sometimes before the final whistle — and winners are paid straight to their wallets.
        </>,
        "Automatically, on official match data, against the prediction exactly as written on the room. It settles as soon as the result is certain — sometimes before the final whistle — and winners are paid straight to their wallets.",
      ),
      faq(
        "What if the match is postponed or nobody takes the other side?",
        <>Everyone gets their full stake back, with no fee. The same happens if a room can&rsquo;t be fairly decided.</>,
        "Everyone gets their full stake back, with no fee. The same happens if a room can't be fairly decided.",
      ),
      faq(
        "Can I leave a room, or join after kickoff?",
        <>
          No to both. A stake is committed until the room settles, the same as everyone else&rsquo;s, and stakes close just before kickoff.
        </>,
        "No to both. A stake is committed until the room settles, the same as everyone else's, and stakes close just before kickoff.",
      ),
      faq(
        "I think a room settled wrongly.",
        <>Email us the room link and what you think happened. We check every report against the match data.</>,
        "Email us the room link and what you think happened. We check every report against the match data.",
      ),
    ],
  },
  {
    id: "fees",
    title: "Fees and hosting",
    items: [
      faq(
        "What does Rivaly charge?",
        <>
          A share of the winners&rsquo; profit — never of a stake. The standard is 5%: 3% to Rivaly and 2% to the room&rsquo;s host. It&rsquo;s
          shown before you stake, and refunded rooms pay nothing. See <Link href="/docs#money">the worked example</Link>.
        </>,
        "A share of the winners' profit — never of a stake. The standard is 5%: 3% to Rivaly and 2% to the room's host. It's shown before you stake, and refunded rooms pay nothing.",
      ),
      faq(
        "How do I get my host earnings?",
        <>
          They build up in your Wallet — pending while your rooms are live, claimable once they settle — and you claim them all in one transfer
          from $1.
        </>,
        "They build up in your Wallet — pending while your rooms are live, claimable once they settle — and you claim them all in one transfer from $1.",
      ),
    ],
  },
  {
    id: "safety",
    title: "Safety",
    items: [
      faq(
        "How do I report a message or post?",
        <>
          On a phone, press and hold the message (or open a post&rsquo;s menu) and choose Report; on a computer, hover over it. It disappears
          for you straight away and our team reviews it.
        </>,
        "On a phone, press and hold the message (or open a post's menu) and choose Report; on a computer, hover over it. It disappears for you straight away and our team reviews it.",
      ),
      faq(
        "I need a break.",
        <>
          Email us how long you want and we&rsquo;ll pause staking on your account for that time. More on our{" "}
          <Link href="/responsible-play">Responsible play</Link> page, including free, confidential help.
        </>,
        "Email us how long you want and we'll pause staking on your account for that time.",
      ),
      faq(
        "What's public about me?",
        <>
          Your profile, your activity in public rooms and your Arena posts. Private rooms aren&rsquo;t. Our <Link href="/privacy">Privacy
          Policy</Link> has the details, and you can turn off anonymous usage data in Settings.
        </>,
        "Your profile, your activity in public rooms and your Arena posts. Private rooms aren't. You can turn off anonymous usage data in Settings.",
      ),
    ],
  },
];

export default function SupportPage() {
  return (
    <CompanyPage
      active="/support"
      title="Help center"
      lede="Guides and answers for everything on Rivaly — and a real person on the other end if yours isn't here."
      band={<SupportSearch />}
      contactLine="Can't find your answer?"
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          url: siteUrl("/support"),
          mainEntity: TOPICS.flatMap((t) => t.items).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.text } })),
        }}
      />

      <section aria-label="Popular topics" className="flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <a key={t.id} href={`#${t.id}`} className={buttonClasses({ variant: "secondary", size: "sm", className: "rounded-full" })}>
            {t.title}
          </a>
        ))}
      </section>

      <SupportFaq topics={TOPICS} />
    </CompanyPage>
  );
}
