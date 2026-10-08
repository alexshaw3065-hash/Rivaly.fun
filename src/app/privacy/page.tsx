import Link from "next/link";
import { Callout, CompanyPage, DocList, DocSection, PlainSummary } from "@/components/company/company-page";
import { COMPANY, POLICY_DATES, formatPolicyDate, mailto } from "@/lib/company";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description:
    "What Rivaly collects, why, who we share it with, the aggregated and anonymised data we sell, what's public on the blockchain, and how to access or delete your data.",
  path: "/privacy",
});

// Written from what the code actually does: first-party analytics with Do
// Not Track / opt-out (lib/analytics/track.ts), the first-touch cookie, the
// providers we really use, and Rivaly Data — aggregated, k-anonymous
// datasets (lib/data/datasets.ts, platform_settings.data_min_group), which
// this policy must disclose before anything is sold. New provider, new
// dataset, new kind of data? Update this page and POLICY_DATES.privacy.
// "Never fewer than 5 people" holds only while data_min_group stays >= 5.

const TOC = [
  { id: "who", label: "Who we are" },
  { id: "collect", label: "What we collect" },
  { id: "use", label: "How we use it" },
  { id: "public", label: "What's public" },
  { id: "share", label: "Who we share it with" },
  { id: "rivaly-data", label: "Aggregated data we sell" },
  { id: "cookies", label: "Cookies and storage" },
  { id: "retention", label: "How long we keep it" },
  { id: "rights", label: "Your choices and rights" },
  { id: "security", label: "Security" },
  { id: "transfers", label: "Where your data is processed" },
  { id: "children", label: "Children" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact" },
];

const n = (id: string) => TOC.findIndex((t) => t.id === id) + 1;

export default function PrivacyPage() {
  const effective = formatPolicyDate(POLICY_DATES.privacy);
  return (
    <CompanyPage
      active="/privacy"
      title="Privacy Policy"
      lede="What we collect when you use Rivaly, why we need it, who sees it, and the choices you have."
      meta={
        <>
          Effective <time dateTime={POLICY_DATES.privacy}>{effective}</time>
        </>
      }
      toc={TOC}
      contactLine="Questions about your data?"
    >
      <PlainSummary
        items={[
          { text: "We collect what it takes to run your account, your rooms and your wallet — and a little anonymous usage data you can switch off.", href: "#collect" },
          { text: "Your profile, public rooms, chat in public rooms and Arena posts are public. So are stakes and payouts on the Solana blockchain.", href: "#public" },
          { text: "We never sell your personal data. We do sell aggregated statistics about matches and the crowd — never names, usernames, wallets or messages, and never about fewer than 5 people.", href: "#rivaly-data" },
          { text: "No advertising trackers. Our analytics are our own, and respect Do Not Track.", href: "#cookies" },
          { text: `You can ask for a copy of your data, or for it to be deleted, at ${COMPANY.email}.`, href: "#rights" },
        ]}
        note="This summary is here to help. The full policy below is what applies."
      />

      <DocSection id="who" n={n("who")} title="Who we are">
        <p>
          {COMPANY.name} (&ldquo;Rivaly&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) runs the Rivaly app and website at {COMPANY.site}. We
          decide how and why your personal data is used, which makes us responsible for it. This policy works alongside our{" "}
          <Link href="/terms">Terms of Use</Link>. Contact us any time at <a href={mailto("Privacy")}>{COMPANY.email}</a>.
        </p>
      </DocSection>

      <DocSection id="collect" n={n("collect")} title="What we collect">
        <p>
          <strong>When you create an account:</strong> your email address (or the identity your social login shares, such as your name and
          email from Google), and the username you choose.
        </p>
        <p>
          <strong>Your profile:</strong> anything you add — display name, photo, banner, bio, colours and links to your social accounts.
        </p>
        <p>
          <strong>Your wallet and activity:</strong> your Solana wallet address, deposits, withdrawals, the rooms you create and join, your
          stakes, sides, results, payouts and host earnings, and the people you follow.
        </p>
        <p>
          <strong>What you post:</strong> chat messages, Arena posts and replies, reactions, photos and GIFs, and any reports you make.
        </p>
        <p>
          <strong>Usage data:</strong> which pages and features are used, the type of device and browser, your country (worked out from your IP
          address, which we don&rsquo;t keep with your activity), and how you first found Rivaly — for example a shared link or a campaign. It
          is linked to your account once you sign in.
        </p>
        <p>
          <strong>When you contact us:</strong> what you send us and our replies.
        </p>
        <p>We don&rsquo;t collect your payment-card or bank details, and we don&rsquo;t hold the keys to your wallet.</p>
      </DocSection>

      <DocSection id="use" n={n("use")} title="How we use it">
        <DocList
          items={[
            <>
              <strong>To run Rivaly for you</strong> — your account, rooms, stakes, settlement, payouts, host earnings, chat and the Arena. (We
              need this to provide the service you signed up for.)
            </>,
            <>
              <strong>To keep Rivaly fair and safe</strong> — preventing fraud, multiple accounts, match-fixing and abuse, enforcing our{" "}
              <Link href="/terms">terms</Link>, and moderating content. (Our legitimate interest in a fair, safe service, and where needed, the
              law.)
            </>,
            <>
              <strong>To improve Rivaly</strong> — understanding which features work, fixing problems and planning what to build. (Our legitimate
              interest; you can switch usage data off.)
            </>,
            <>
              <strong>To talk to you</strong> — in-app notifications about your rooms and people you follow, and replies when you contact us.
            </>,
            <>
              <strong>To meet legal obligations</strong> — keeping records and responding to lawful requests.
            </>,
          ]}
        />
        <p>
          We don&rsquo;t use your data for advertising, and we don&rsquo;t make automated decisions about you that have legal or similarly
          significant effects. Rooms settle automatically from match data — that&rsquo;s about the match, not about you.
        </p>
      </DocSection>

      <DocSection id="public" n={n("public")} title="What's public">
        <p>Rivaly is social, so some things are visible to everyone, including people who aren&rsquo;t signed in and search engines:</p>
        <DocList
          items={[
            <>your username, profile, follower counts, record and the rooms you&rsquo;ve created or joined in public rooms;</>,
            <>which side you took and your stake in a public room, and what you say in its chat;</>,
            <>your Arena posts, replies and reactions.</>,
          ]}
        />
        <p>
          Private rooms are visible only to the people in them and are never shown to search engines. Host earnings are private unless you
          choose to show them.
        </p>
        <Callout title="The blockchain is public and permanent.">
          Deposits, stakes, payouts and withdrawals are transactions on the Solana network. Anyone can see the wallet addresses and amounts
          involved, and someone who knows your wallet address could connect it to your activity. Nobody — including us — can change or delete a
          blockchain transaction.
        </Callout>
      </DocSection>

      <DocSection id="share" n={n("share")} title="Who we share it with">
        <Callout tone="good" title="We never sell your personal data.">
          We share it only with the people below, for the reasons given.
        </Callout>
        <DocList
          items={[
            <>
              <strong>Service providers who run Rivaly for us</strong>, under contracts that let them use it only to provide their service:
              Supabase (database, sign-in and storage), Vercel (hosting), Dynamic (sign-in and wallets), Helius (access to the Solana network),
              Cloudinary (photos), Klipy (GIF search, which receives a coded ID, not your name) and Render (scheduled jobs).
            </>,
            <>
              <strong>Sign-in providers you choose</strong>, such as Google, under their own privacy policies.
            </>,
            <>
              <strong>Authorities</strong>, when the law requires it, or to protect people from fraud or harm.
            </>,
            <>
              <strong>A buyer or successor</strong>, if Rivaly is reorganised, merged or sold — they would remain bound by this policy.
            </>,
          ]}
        />
        <p>
          Our sports-data providers send us match data; they don&rsquo;t receive anything about you.
        </p>
      </DocSection>

      <DocSection id="rivaly-data" n={n("rivaly-data")} title="Aggregated data we sell">
        <p>
          Rivaly sees how fans call matches: which way the crowd leans, how money moves before kickoff, and how often the crowd is right.
          Through Rivaly Data, we sell or license <strong>aggregated, anonymised statistics</strong> like these to partners such as media
          companies, clubs, leagues and researchers.
        </p>
        <DocList
          items={[
            <>Every figure is a total or an average across many people, calculated inside our database.</>,
            <>No figure describes fewer than 5 different people — smaller groups are left out entirely.</>,
            <>No dataset contains names, usernames, email addresses, wallet addresses or anything anyone has written.</>,
            <>Partners must agree not to try to identify anyone from the data.</>,
          ]}
        />
        <p>This data can&rsquo;t reasonably identify you, so it isn&rsquo;t personal data — but we want you to know it exists.</p>
      </DocSection>

      <DocSection id="cookies" n={n("cookies")} title="Cookies and storage">
        <p>We use a small number of cookies and browser storage items, and no advertising or third-party tracking cookies:</p>
        <DocList
          items={[
            <>
              <strong>Essential</strong> — keeping you signed in, and the sign-in and wallet provider&rsquo;s own session. Rivaly can&rsquo;t
              work without these.
            </>,
            <>
              <strong>Preferences</strong> — light or dark mode, and things you&rsquo;ve already seen, such as the first-time guide.
            </>,
            <>
              <strong>Our own analytics</strong> — a random browser ID, a visit ID that resets after 30 minutes idle, and a cookie recording how
              you first arrived (kept for 180 days) so we know which channels bring people to Rivaly.
            </>,
          ]}
        />
        <p>
          Analytics switch off automatically if your browser sends Do Not Track or Global Privacy Control, and you can turn them off any time
          in Settings on your profile (&ldquo;Share anonymous usage data&rdquo;).
        </p>
      </DocSection>

      <DocSection id="retention" n={n("retention")} title="How long we keep it">
        <p>
          We keep your account data for as long as your account is open. When you close it, we delete or anonymise your personal data within a
          reasonable time, except what we must keep — for example records of financial transactions, or information needed to prevent fraud
          or deal with a dispute — which we keep only as long as that need lasts.
        </p>
        <p>
          Things that have become part of other people&rsquo;s rooms (such as your stake in a settled pool) are kept without your name where
          we can. Blockchain transactions can&rsquo;t be deleted by anyone.
        </p>
      </DocSection>

      <DocSection id="rights" n={n("rights")} title="Your choices and rights">
        <p>You can change your profile at any time and switch off usage data in Settings. You can also ask us to:</p>
        <DocList
          items={[
            <>give you a copy of the personal data we hold about you, in a portable format;</>,
            <>correct anything that&rsquo;s wrong;</>,
            <>delete your data and close your account;</>,
            <>stop or limit a particular use of your data, or object to it.</>,
          ]}
        />
        <p>
          Email <a href={mailto("Privacy request")}>{COMPANY.email}</a> from the address on your account. We&rsquo;ll reply within 30 days, and
          may need to confirm it&rsquo;s you first. Depending on where you live, you can also complain to your local data-protection
          authority — though we&rsquo;d like the chance to put it right first.
        </p>
      </DocSection>

      <DocSection id="security" n={n("security")} title="Security">
        <p>
          Data is encrypted in transit, access to our database is restricted by row-level security so people can only read what they&rsquo;re
          allowed to, and access to admin tools is limited, logged and audited. Your wallet&rsquo;s keys are managed by our wallet provider and
          never held by Rivaly. No system is perfectly secure; if a breach affects you, we&rsquo;ll tell you and the relevant authorities as the
          law requires.
        </p>
      </DocSection>

      <DocSection id="transfers" n={n("transfers")} title="Where your data is processed">
        <p>
          Our providers may process data in countries other than yours, including the United States. Where the law requires it, we rely on
          safeguards such as standard contractual clauses for those transfers.
        </p>
      </DocSection>

      <DocSection id="children" n={n("children")} title="Children">
        <p>
          Rivaly is only for people aged 18 and over. We don&rsquo;t knowingly collect data from anyone younger; if we learn we have, we close
          the account and delete it. If you think a child is using Rivaly, tell us at <a href={mailto("Underage account")}>{COMPANY.email}</a>.
        </p>
      </DocSection>

      <DocSection id="changes" n={n("changes")} title="Changes to this policy">
        <p>
          When this policy changes, we&rsquo;ll update the date at the top, and tell you in the app before material changes take effect.
        </p>
        <p className="text-caption text-tertiary">{effective}: first published.</p>
      </DocSection>

      <DocSection id="contact" n={n("contact")} title="Contact">
        <p>
          Email <a href={mailto("Privacy")}>{COMPANY.email}</a> with any question or request about your data.
        </p>
      </DocSection>
    </CompanyPage>
  );
}
