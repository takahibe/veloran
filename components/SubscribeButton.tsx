"use client";

import { usePrivy } from "@privy-io/react-auth";
import {
  useWallets,
  useSignAndSendTransaction,
} from "@privy-io/react-auth/solana";
import { useRouter } from "next/navigation";
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
import { microUsdcToUsd } from "@/lib/slug";

type Plan = "monthly" | "yearly";

type Props = {
  creatorId: string;
  creatorAddress: string;
  plan: Plan;
  priceUsdc: number; // micro-USDC
  /** If set, shows the "Subscribed until ..." state immediately. */
  initialExpiresAt?: string | null;
};

type Status = "idle" | "paying" | "verifying" | "subscribed" | "error";

// Small base58 encoder (matches PaywallGate to avoid pulling in another dep)
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

export function SubscribeButton({
  creatorId,
  creatorAddress,
  plan,
  priceUsdc,
  initialExpiresAt,
}: Props) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const router = useRouter();

  const [status, setStatus] = useState<Status>(
    initialExpiresAt ? "subscribed" : "idle"
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(
    initialExpiresAt ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);

  const wallet = wallets[0];
  const priceUsd = microUsdcToUsd(priceUsdc);
  const planLabel = plan === "yearly" ? "year" : "month";

  async function handleSubscribe() {
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

      const subscriber = new PublicKey(wallet.address);
      const creator = new PublicKey(creatorAddress);
      const subscriberAta = getAssociatedTokenAddressSync(
        USDC_DEVNET_MINT,
        subscriber
      );
      const creatorAta = getAssociatedTokenAddressSync(
        USDC_DEVNET_MINT,
        creator
      );
      const platformAta = getAssociatedTokenAddressSync(
        USDC_DEVNET_MINT,
        VELORAN_TREASURY
      );

      // Same flow as PaywallGate: idempotent ATA creates, then the
      // generic pay_for_content with the tier price.
      const ixs = [
        createAssociatedTokenAccountIdempotentInstruction(
          subscriber,
          creatorAta,
          creator,
          USDC_DEVNET_MINT
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          subscriber,
          platformAta,
          VELORAN_TREASURY,
          USDC_DEVNET_MINT
        ),
        buildPayForContentIx(
          {
            reader: subscriber,
            readerAta: subscriberAta,
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
        payerKey: subscriber,
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
      const res = await fetch(`/api/subscriptions/${creatorId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ txSignature: sigB58, plan }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? `Subscribe failed (${res.status})`);
      }

      setExpiresAt(body.expiresAt);
      setStatus("subscribed");
      // Re-render the parent server component so siblings (e.g. the
      // *other* plan's button on /c/[address]) become the unified
      // "Subscribed" card instead of staying clickable. Without this,
      // a user who just paid for yearly could still hit the monthly
      // button and double-pay until manual refresh.
      router.refresh();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Subscribe failed");
      setStatus("error");
    }
  }

  if (status === "subscribed" && expiresAt) {
    const expDate = new Date(expiresAt);
    return (
      <div className="rounded-xl border border-violet-700/40 bg-violet-950/20 p-5 text-center">
        <p className="text-xs uppercase tracking-wider text-violet-300">
          Subscribed
        </p>
        <p className="mt-2 text-sm text-neutral-200">
          Active until{" "}
          <span className="font-medium">
            {expDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </p>
        {txSig && (
          <a
            href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-xs font-mono text-violet-400 hover:text-violet-300"
          >
            {txSig.slice(0, 10)}…{txSig.slice(-6)} ↗
          </a>
        )}
      </div>
    );
  }

  const label =
    status === "paying"
      ? "Sending payment…"
      : status === "verifying"
        ? "Verifying on-chain…"
        : !authenticated
          ? `Sign in to subscribe`
          : `Subscribe · $${priceUsd}/${planLabel}`;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSubscribe}
        disabled={status === "paying" || status === "verifying"}
        className="px-5 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-wait text-white font-medium transition shadow-lg shadow-violet-600/20"
      >
        {label}
      </button>
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
