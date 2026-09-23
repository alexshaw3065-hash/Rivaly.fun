"use client";

import { useCallback, useRef, useState } from "react";
import { Transaction } from "@solana/web3.js";
import { isSolanaWallet } from "@dynamic-labs/solana";
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

export function useStake() {
  const { signingWallet } = useWallet();
  const [phase, setPhase] = useState<StakePhase>("idle");
  const busy = useRef(false);

  const stake = useCallback(
    async (req: StakeRequest): Promise<SubmitResult> => {
      if (busy.current) return { ok: false, error: "A stake is already on its way." };
      if (!signingWallet || !isSolanaWallet(signingWallet)) {
        return { ok: false, error: "Your wallet isn't connected — sign in again to stake." };
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
          const signer = await signingWallet.getSigner();
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
    [signingWallet],
  );

  const walletReady = Boolean(signingWallet && isSolanaWallet(signingWallet));
  return { stake, phase, walletReady };
}
