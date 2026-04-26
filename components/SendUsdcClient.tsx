"use client";

import { usePrivy } from "@privy-io/react-auth";
import {
  useSignAndSendTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { FormEvent, useState } from "react";
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import Link from "next/link";
import { PUBLIC_RPC_URL, USDC_DEVNET_MINT } from "@/lib/solana";

const USDC_DECIMALS = 6;

type Status = "idle" | "sending" | "done" | "error";

export function SendUsdcClient() {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("2");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const wallet = wallets[0];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!authenticated) {
      login();
      return;
    }
    if (!wallet) {
      setError("No Solana wallet attached.");
      return;
    }

    let recipientPk: PublicKey;
    try {
      recipientPk = new PublicKey(recipient.trim());
    } catch {
      setError("Invalid recipient address");
      return;
    }
    const microUsdc = Math.round(parseFloat(amount) * 1_000_000);
    if (!microUsdc || microUsdc <= 0) {
      setError("Invalid amount");
      return;
    }

    try {
      setStatus("sending");
      const sender = new PublicKey(wallet.address);
      const senderAta = getAssociatedTokenAddressSync(USDC_DEVNET_MINT, sender);
      const recipientAta = getAssociatedTokenAddressSync(
        USDC_DEVNET_MINT,
        recipientPk
      );

      const ixs = [
        createAssociatedTokenAccountIdempotentInstruction(
          sender,
          recipientAta,
          recipientPk,
          USDC_DEVNET_MINT
        ),
        createTransferCheckedInstruction(
          senderAta,
          USDC_DEVNET_MINT,
          recipientAta,
          sender,
          BigInt(microUsdc),
          USDC_DECIMALS
        ),
      ];

      const connection = new Connection(PUBLIC_RPC_URL, "confirmed");
      const { blockhash } = await connection.getLatestBlockhash("confirmed");

      const message = new TransactionMessage({
        payerKey: sender,
        recentBlockhash: blockhash,
        instructions: ixs,
      }).compileToV0Message();
      const tx = new VersionedTransaction(message);

      const { signature: sigBytes } = await signAndSendTransaction({
        transaction: tx.serialize(),
        wallet,
        chain: "solana:devnet",
      });

      const sigB58 = bytesToBase58(sigBytes);
      setSignature(sigB58);
      setStatus("done");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Send failed");
      setStatus("error");
    }
  }

  if (!ready) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-10 max-w-md mx-auto w-full">
      <Link
        href="/dashboard"
        className="text-sm text-neutral-500 hover:text-neutral-300"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Send USDC (devnet)</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Tooling page. Sends USDC from your logged-in wallet to any address —
        useful for funding test agents.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-1.5">
            Recipient address
          </label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="3P6VDak…"
            className="w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2.5 font-mono text-sm focus:border-violet-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-200 mb-1.5">
            Amount (USDC)
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-lg bg-neutral-900/60 border border-neutral-800 px-3 py-2.5 focus:border-violet-500 outline-none"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-wait text-white font-medium transition"
        >
          {status === "sending"
            ? "Sending…"
            : !authenticated
              ? "Sign in to send"
              : "Send USDC"}
        </button>
      </form>

      {status === "done" && signature && (
        <div className="mt-8 rounded-xl border border-violet-700/40 bg-violet-950/20 p-5">
          <p className="text-xs uppercase tracking-wider text-violet-300">
            Sent
          </p>
          <a
            href={`https://solscan.io/tx/${signature}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-sm text-violet-300 hover:text-violet-200 font-mono break-all"
          >
            {signature} ↗
          </a>
        </div>
      )}
    </main>
  );
}

// (Same base58 helper used in PaywallGate.tsx — Privy returns a Uint8Array sig.)
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
