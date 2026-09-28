"use client";

import { useCallback, useRef, useState } from "react";
import { prepareStake, submitStake, type StakeRequest, type SubmitResult } from "@/app/rooms/actions";
import { useWallet } from "@/lib/wallet/wallet-context";

// The browser half of a gasless stake. The server builds the transfer; the
// user's embedded wallet signs it behind Dynamic's own confirm screen (kept
// on purpose — it shows the amount and destination before anything moves);
// the server co-signs as fee payer and sends. `phase` is real progress, not
// a timer, so the button can say exactly what's happening.

export type StakePhase = "idle" | "preparing" | "confirm" | "locking" | "done";

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const short = (addr: string | null) => (addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : "another wallet");

/**
 * What the stake button shows while the wallet can't sign yet. Signed in to
 * Rivaly always means signed in to the wallet, so this is only ever a brief
 * "getting ready" beat, or one of two rare cases worth a clear sentence.
 */
export function walletBlocker(
  status: string,
  address: string | null,
  connectedAddress: string | null,
): { label?: string; hint: string; busy?: boolean } | null {
  switch (status) {
    case "loading":
      return { label: "Getting your wallet ready…", hint: "", busy: true };
    case "unavailable":
      return { label: "Wallet didn't load — retry", hint: "Check your connection. Your pick is kept." };
    case "expired":
      // Keep the normal "Throw down…" label — the tap is just a quick
      // sign-in that returns to this exact stake.
      return { hint: "Your login timed out — tap to sign back in. Your pick is kept." };
    case "no_wallet":
      return { label: "Sign in again to finish your wallet", hint: "Your wallet didn't finish setting up. One sign-in completes it — your pick stays put." };
    case "mismatch":
      return {
        label: "Sign in with this wallet",
        hint: `Your wallet app is on ${short(connectedAddress)}, but this account uses ${short(address)}. Switch accounts in the wallet app, or sign in with the one that's open.`,
      };
    default:
      return null;
  }
}

export function useStake() {
  const { signingWallet, status, address, connectedAddress, reconnect } = useWallet();
  const [phase, setPhase] = useState<StakePhase>("idle");
  const busy = useRef(false);

  const stake = useCallback(
    async (req: StakeRequest): Promise<SubmitResult> => {
      if (busy.current) return { ok: false, error: "A stake is already on its way." };
      if (!signingWallet || !signingWallet.isSolana) {
        return { ok: false, error: walletBlocker(status, address, connectedAddress)?.hint || "Reconnect your wallet to stake." };
      }
      busy.current = true;
      try {
        setPhase("preparing");
        const prep = await prepareStake(req);
        if (!prep.ok) {
          setPhase("idle");
          return prep;
        }

        setPhase("confirm");
        let signedBase64: string;
        try {
          // Solana's transaction code loads only when someone actually stakes.
          const [{ Transaction }, signer] = await Promise.all([import("@solana/web3.js"), signingWallet.getSigner()]);
          const signed = await signer.signTransaction(Transaction.from(fromBase64(prep.transactionBase64)));
          signedBase64 = toBase64(signed.serialize({ requireAllSignatures: false, verifySignatures: false }));
        } catch {
          setPhase("idle");
          return { ok: false, error: "Stake cancelled — nothing was sent." };
        }

        setPhase("locking");
        const res = await submitStake(prep.intentId, signedBase64);
        setPhase(res.ok ? "done" : "idle");
        return res;
      } catch {
        setPhase("idle");
        return { ok: false, error: "Couldn't reach Rivaly — check your connection and try again." };
      } finally {
        busy.current = false;
      }
    },
    [signingWallet, status, address, connectedAddress],
  );

  const walletReady = status === "ready";
  const blocker = status === "signed_out" ? null : walletBlocker(status, address, connectedAddress);
  return { stake, phase, walletReady, blocker, reconnect };
}
