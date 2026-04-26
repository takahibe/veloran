"use client";

import { usePrivy } from "@privy-io/react-auth";
import {
  useWallets,
  useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import { useState } from "react";
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  PUBLIC_RPC_URL,
  USDC_DEVNET_MINT,
  VELORAN_TREASURY,
} from "@/lib/solana";
import { buildPayForContentIx } from "@/lib/anchor-client";

type Props = {
  slug: string;
  priceUsd: string;
  priceUsdc: number; // micro-USDC
  creatorAddress: string;
  /** Server-verified content (cookie-gated). When present, gate starts unlocked. */
  initialContent?: string | null;
};

type Status = "idle" | "paying" | "verifying" | "unlocked" | "error";

export function PaywallGate({
  slug,
  priceUsd,
  priceUsdc,
  creatorAddress,
  initialContent,
}: Props) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const [status, setStatus] = useState<Status>(
    initialContent ? "unlocked" : "idle"
  );
  const [content, setContent] = useState<string | null>(
    initialContent ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const wallet = wallets[0];

  async function handleUnlock() {
    setError(null);
    if (!ready) return;
    if (!authenticated) {
      login();
      return;
    }
    if (!wallet) {
      setError("No Solana wallet attached to your account yet.");
      return;
    }

    try {
      setStatus("paying");

      const reader = new PublicKey(wallet.address);
      const creator = new PublicKey(creatorAddress);
      const readerAta = getAssociatedTokenAddressSync(
        USDC_DEVNET_MINT,
        reader
      );
      const creatorAta = getAssociatedTokenAddressSync(
        USDC_DEVNET_MINT,
        creator
      );
      const platformAta = getAssociatedTokenAddressSync(
        USDC_DEVNET_MINT,
        VELORAN_TREASURY
      );

      // Build instructions: idempotently create creator + platform USDC
      // ATAs (reader pays rent if they're missing), then call our
      // Anchor program to do the 95/5 split atomically.
      const ixs = [
        createAssociatedTokenAccountIdempotentInstruction(
          reader,
          creatorAta,
          creator,
          USDC_DEVNET_MINT
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          reader,
          platformAta,
          VELORAN_TREASURY,
          USDC_DEVNET_MINT
        ),
        buildPayForContentIx(
          {
            reader,
            readerAta,
            creatorAta,
            platformAta,
            mint: USDC_DEVNET_MINT,
          },
          BigInt(priceUsdc)
        ),
      ];

      const connection = new Connection(PUBLIC_RPC_URL, "confirmed");
      const { blockhash } = await connection.getLatestBlockhash("confirmed");

      const message = new TransactionMessage({
        payerKey: reader,
        recentBlockhash: blockhash,
        instructions: ixs,
      }).compileToV0Message();
      const versionedTx = new VersionedTransaction(message);

      const { signature } = await signAndSendTransaction({
        transaction: versionedTx.serialize(),
        wallet,
        chain: "solana:devnet",
      });
      const sigB58 = bytesToBase58(signature);
      setTxSig(sigB58);

      // Wait for confirmation before asking server to verify
      setStatus("verifying");
      await connection.confirmTransaction(
        {
          signature: sigB58,
          blockhash,
          lastValidBlockHeight: (await connection.getLatestBlockhash())
            .lastValidBlockHeight,
        },
        "confirmed"
      );

      const token = await getAccessToken();
      const res = await fetch(`/api/unlock/${slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ txSignature: sigB58 }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? `Unlock failed (${res.status})`);
      }

      setContent(body.content);
      setStatus("unlocked");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Payment failed");
      setStatus("error");
    }
  }

  if (status === "unlocked" && content !== null) {
    return (
      <div className="mt-10">
        <div className="rounded-xl border border-violet-700/40 bg-violet-950/20 p-5 mb-6">
          <p className="text-xs uppercase tracking-wider text-violet-300">
            Unlocked
          </p>
          {txSig && (
            <p className="mt-1 text-xs text-neutral-500 font-mono break-all">
              <a
                href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-violet-300"
              >
                {txSig.slice(0, 12)}…{txSig.slice(-8)} ↗
              </a>
            </p>
          )}
        </div>
        <article className="prose prose-invert max-w-none whitespace-pre-wrap text-neutral-200 leading-relaxed">
          {content}
        </article>
      </div>
    );
  }

  const label =
    status === "paying"
      ? "Sending payment…"
      : status === "verifying"
        ? "Verifying on-chain…"
        : !authenticated
          ? `Sign in to unlock for $${priceUsd}`
          : `Unlock for $${priceUsd} USDC`;

  return (
    <div className="relative mt-10 rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
      <div className="p-6 select-none pointer-events-none">
        <p className="blur-sm text-neutral-400 leading-relaxed">
          The rest of this post is paywalled. Inside, the creator shares their
          full thesis, data, and conclusions — unlocked instantly after
          payment.
        </p>
        <p className="mt-4 blur-sm text-neutral-400 leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
          lacinia odio vitae vestibulum vestibulum. Cras venenatis euismod
          malesuada. Nullam cursus sapien vel venenatis.
        </p>
        <p className="mt-4 blur-sm text-neutral-400 leading-relaxed">
          Integer luctus, nisi a tristique scelerisque, mi magna rhoncus leo,
          at cursus turpis mauris eget metus. Aenean et posuere augue.
        </p>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/60 to-neutral-950 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 pb-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-500">
          <LockIcon />
          <span>Paywalled</span>
        </div>
        <button
          onClick={handleUnlock}
          disabled={status === "paying" || status === "verifying"}
          className="px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-wait text-white font-medium transition shadow-lg shadow-violet-600/20"
        >
          {label}
        </button>
        {error && (
          <p className="text-xs text-red-400 max-w-sm text-center px-4">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

// Small base58 encoder so we don't pull in another dep
const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function bytesToBase58(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (let i = 0; i < zeros; i++) out += "1";
  for (let i = digits.length - 1; i >= 0; i--) out += ALPHA[digits[i]];
  return out;
}
