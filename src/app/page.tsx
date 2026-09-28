import { HomeScreen } from "@/components/home-screen";
import { HomeIntro, SiteFooter } from "@/components/seo/home-intro";
import { getCurrentProfile } from "@/lib/supabase/current-user";
import { pageMeta } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";

export const metadata = pageMeta({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/", absoluteTitle: true });

// Home (the screen itself is components/home-screen.tsx). Signed-out
// visitors — and search engines / AI assistants, which are always signed
// out — also get a server-rendered heading, one line on what Rivaly is and a
// footer of links; people already in the app don't need either.
export default async function Home() {
  const me = await getCurrentProfile();
  return <HomeScreen intro={me ? undefined : <HomeIntro />} footer={me ? undefined : <SiteFooter />} />;
}
