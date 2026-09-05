import { redirect } from "next/navigation";

// Google/Apple/email/wallet are all "sign up or sign in" now — Dynamic
// doesn't distinguish the two the way the old email/password form did, so
// there's no separate signup screen anymore (matches the Polymarket
// reference: one screen, not two). Keeping the route alive rather than
// 404ing it — anything still linking here (an old bookmark, a stray
// internal link) lands on the real thing instead of a dead end.
export default function SignupPage() {
  redirect("/login");
}
