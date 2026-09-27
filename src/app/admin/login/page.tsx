"use client";

import { useActionState } from "react";
import { adminLogin } from "./actions";

// The door to Rivaly Ops. Nothing here reveals anything about the system.
export default function AdminLogin() {
  const [state, action, pending] = useActionState(adminLogin, { error: null });
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <form action={action} className="w-full max-w-sm rounded-2xl bg-surface p-6 ring-1 ring-border">
        <p className="font-display text-xl font-bold tracking-tight text-foreground">Rivaly Ops</p>
        <p className="mt-1 text-[13px] text-muted">Internal. Sign in with the ops password.</p>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="mt-5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none focus:border-border-strong"
          placeholder="Password"
        />
        {state.error && <p className="mt-2 text-[12px] text-rival-red">{state.error}</p>}
        <button disabled={pending} className="mt-4 h-10 w-full rounded-md bg-foreground text-[14px] font-semibold text-background disabled:opacity-50">
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
