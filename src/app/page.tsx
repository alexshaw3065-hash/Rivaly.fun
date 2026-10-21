import { HomeScreen } from "@/components/home-screen";
import { SiteFooter } from "@/components/seo/site-footer";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import { pageMeta } from "@/lib/seo";
import { getHomeData } from "@/lib/home-data";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";

export const metadata = pageMeta({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/", absoluteTitle: true });

// Home (the screen itself is components/home-screen.tsx). Home stays the app
// — no explainer block on top; new visitors get the How it works sheet
// (how-it-works.tsx) and the About page instead. Signed-out visitors, which
// includes search engines and AI assistants, also get a server-rendered
// footer: links plus the one-line definition of Rivaly they can read.
export default async function Home() {
  // Who you are and the page's first data, in parallel; the data is shared and cached (home-data.ts).
  const [me, initial] = await Promise.all([getCurrentProfile(), getHomeData()]);
  // The page's one heading, for screen readers and search engines: Home's
  // visible screen is the app itself, with no title block.
  return (
    <>
      <h1 className="sr-only">{SITE_TITLE}</h1>
      <HomeScreen initial={initial} footer={me ? undefined : <SiteFooter />} />
    </>
  );
}
