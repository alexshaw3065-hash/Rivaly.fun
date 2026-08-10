import { Logo } from "@/components/logo";
import { WaitlistForm } from "@/components/waitlist-form";
import { getWaitlistCount } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

export default async function WaitlistLanding() {
  const count = await getWaitlistCount();

  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden px-6">
      {/* Ambient rivalry glow — blue vs green, the core motif */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-rival-blue/25 blur-[110px] animate-[floatGlow_9s_ease-in-out_infinite]" />
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-victory-green/25 blur-[110px] animate-[floatGlow_11s_ease-in-out_infinite]" />
      </div>

      <section className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 py-20 text-center">
        <div className="animate-rise" style={{ animationDelay: "0ms" }}>
          <Logo className="h-24 w-24 drop-shadow-[0_8px_30px_rgba(37,99,255,0.25)]" />
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-medium text-muted animate-rise"
          style={{ animationDelay: "80ms" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-victory-green animate-[pulseDot_1.6s_ease-in-out_infinite]" />
          </span>
          Pre-season — early access opening soon
        </div>

        <h1
          className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl animate-rise"
          style={{ animationDelay: "160ms" }}
        >
          Back your football{" "}
          <span className="bg-gradient-to-r from-rival-blue to-victory-green bg-clip-text text-transparent">
            opinion.
          </span>
        </h1>

        <p
          className="max-w-lg text-lg text-muted animate-rise"
          style={{ animationDelay: "240ms" }}
        >
          Rivaly is the arena where football fans challenge{" "}
          <span className="text-foreground">real people</span> — not the house.
          Create a room, call out a rival, and settle it when the whistle blows.
        </p>

        <div className="animate-rise" style={{ animationDelay: "320ms" }}>
          <WaitlistForm />
        </div>

        <div
          className="flex items-center gap-6 text-sm text-muted animate-rise"
          style={{ animationDelay: "400ms" }}
        >
          {count !== null && count > 0 && (
            <span>
              <span className="font-semibold text-foreground">
                {count.toLocaleString()}
              </span>{" "}
              rivals already waiting
            </span>
          )}
        </div>
      </section>

      <div className="grid w-full max-w-3xl gap-4 pb-24 sm:grid-cols-3">
        {[
          {
            title: "You vs them",
            body: "Every prediction is a challenge to someone who disagrees.",
            accent: "text-rival-blue",
          },
          {
            title: "Winner takes the pool",
            body: "Real stakes, held in escrow, settled transparently.",
            accent: "text-victory-green",
          },
          {
            title: "The rivalry never ends",
            body: "Win, lose, rematch. Every match writes a story.",
            accent: "text-foreground",
          },
        ].map((card, i) => (
          <div
            key={card.title}
            className="rounded-2xl border border-border bg-surface/50 p-5 text-left animate-rise"
            style={{ animationDelay: `${480 + i * 80}ms` }}
          >
            <h3 className={`font-semibold ${card.accent}`}>{card.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{card.body}</p>
          </div>
        ))}
      </div>

      <footer className="pb-8 text-xs text-muted">
        © {new Date().getFullYear()} Rivaly · Football, made personal.
      </footer>
    </main>
  );
}
