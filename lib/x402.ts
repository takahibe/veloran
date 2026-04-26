import type { ParsedTransactionWithMeta } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  USDC_DEVNET_MINT,
  VELORAN_PROGRAM_ID,
  VELORAN_TREASURY,
} from "./solana";

/**
 * Veloran's x402-style payment scheme.
 *
 * The official Coinbase x402 "exact" SVM scheme rejects custom-program
 * calls (it requires a vanilla SPL transferChecked). Since our 95/5
 * split *is* the differentiator, we keep the 402 + X-PAYMENT envelope
 * but use our own scheme name + verification rules. See
 * docs/x402-spike.md for the rationale.
 */
export const VELORAN_X402_SCHEME = "exact-veloran";
export const VELORAN_X402_NETWORK = "solana-devnet";
export const X402_VERSION = 1;

/** Mirror of the program's PLATFORM_BPS constant (5.00%). */
export const PLATFORM_BPS = 500n;
export const BPS_DENOMINATOR = 10_000n;

// ---------------------------------------------------------------------------
// 402 challenge construction
// ---------------------------------------------------------------------------

export type PostForRequirements = {
  slug: string;
  priceUsdc: number;
  preview: string;
  creator: { solanaAddress: string };
};

export type PaymentRequirements = {
  scheme: string;
  network: string;
  asset: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: {
    creator: string;
    creatorAta: string;
    platform: string;
    platformAta: string;
  };
  extra: {
    programId: string;
    splitBps: { creator: number; platform: number };
  };
};

export function buildPaymentRequirements(
  post: PostForRequirements
): PaymentRequirements {
  const creatorAta = getAssociatedTokenAddressSync(
    USDC_DEVNET_MINT,
    new PublicKey(post.creator.solanaAddress)
  ).toBase58();
  const platformAta = getAssociatedTokenAddressSync(
    USDC_DEVNET_MINT,
    VELORAN_TREASURY
  ).toBase58();

  return {
    scheme: VELORAN_X402_SCHEME,
    network: VELORAN_X402_NETWORK,
    asset: USDC_DEVNET_MINT.toBase58(),
    maxAmountRequired: String(post.priceUsdc),
    resource: `/api/x402/${post.slug}`,
    description: `Unlock "${post.preview}" — pays creator (95%) + Veloran (5%) via on-chain split`,
    payTo: {
      creator: post.creator.solanaAddress,
      creatorAta,
      platform: VELORAN_TREASURY.toBase58(),
      platformAta,
    },
    extra: {
      programId: VELORAN_PROGRAM_ID.toBase58(),
      splitBps: {
        creator: Number(BPS_DENOMINATOR - PLATFORM_BPS),
        platform: Number(PLATFORM_BPS),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// X-PAYMENT header coding
// ---------------------------------------------------------------------------

export type PaymentHeader = {
  scheme: string;
  network: string;
  txSignature: string;
  payerAddress: string;
};

export function base64urlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64urlDecode(input: string): string | null {
  try {
    const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
    const std = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return Buffer.from(std, "base64").toString("utf8");
  } catch {
    return null;
  }
}

export function parsePaymentHeader(
  headerValue: string | null
): PaymentHeader | null {
  if (!headerValue) return null;
  const json = base64urlDecode(headerValue.trim());
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.scheme !== "string") return null;
  if (typeof p.network !== "string") return null;
  if (typeof p.txSignature !== "string" || p.txSignature.length < 32) return null;
  if (typeof p.payerAddress !== "string" || p.payerAddress.length < 32) return null;

  // Validate payer is a real base58 pubkey (cheap throw catch)
  try {
    new PublicKey(p.payerAddress);
  } catch {
    return null;
  }

  return {
    scheme: p.scheme,
    network: p.network,
    txSignature: p.txSignature,
    payerAddress: p.payerAddress,
  };
}

export function buildPaymentResponseHeader(
  ok: boolean,
  txSignature: string
): string {
  return base64urlEncode(JSON.stringify({ ok, txSignature }));
}

// ---------------------------------------------------------------------------
// On-chain verification
// ---------------------------------------------------------------------------

export type VerifyResult =
  | { ok: true; creatorDelta: bigint; platformDelta: bigint; price: bigint }
  | { ok: false; status: number; error: string };

type PostForVerification = {
  priceUsdc: number;
  creator: { solanaAddress: string };
};

/**
 * Pure verification: caller fetches the parsed tx, we walk it.
 * Confirms (1) tx invokes the Veloran program, (2) creator + platform
 * USDC ATAs received >= the program's split math, and (3) the claimed
 * payer's ATA is the source of funds.
 */
export function verifyOnChainPayment(args: {
  tx: ParsedTransactionWithMeta;
  post: PostForVerification;
  expectedPayerAddress: string;
}): VerifyResult {
  const { tx, post, expectedPayerAddress } = args;

  if (tx.meta?.err) {
    return { ok: false, status: 400, error: "Transaction failed on-chain" };
  }

  // Compute expected ATAs
  const payerPk = new PublicKey(expectedPayerAddress);
  const creatorPk = new PublicKey(post.creator.solanaAddress);
  const creatorAta = getAssociatedTokenAddressSync(
    USDC_DEVNET_MINT,
    creatorPk
  ).toBase58();
  const payerAta = getAssociatedTokenAddressSync(
    USDC_DEVNET_MINT,
    payerPk
  ).toBase58();
  const platformAta = getAssociatedTokenAddressSync(
    USDC_DEVNET_MINT,
    VELORAN_TREASURY
  ).toBase58();

  const accountKeys = tx.transaction.message.accountKeys.map((k) =>
    k.pubkey.toBase58()
  );
  if (!accountKeys.includes(VELORAN_PROGRAM_ID.toBase58())) {
    return {
      ok: false,
      status: 400,
      error: "Transaction did not invoke the Veloran program",
    };
  }

  const pre = tx.meta?.preTokenBalances ?? [];
  const post_ = tx.meta?.postTokenBalances ?? [];

  const balanceFor = (
    arr: typeof pre,
    owner: string,
    accountIndex: number
  ): bigint => {
    const entry = arr.find(
      (b) =>
        b.accountIndex === accountIndex &&
        b.mint === USDC_DEVNET_MINT.toBase58() &&
        b.owner === owner
    );
    return entry ? BigInt(entry.uiTokenAmount.amount) : 0n;
  };

  const creatorAtaIdx = accountKeys.indexOf(creatorAta);
  const platformAtaIdx = accountKeys.indexOf(platformAta);
  const payerAtaIdx = accountKeys.indexOf(payerAta);
  if (creatorAtaIdx === -1) {
    return {
      ok: false,
      status: 400,
      error: "Creator USDC account not in transaction",
    };
  }
  if (platformAtaIdx === -1) {
    return {
      ok: false,
      status: 400,
      error: "Platform USDC account not in transaction",
    };
  }

  const price = BigInt(post.priceUsdc);
  const expectedPlatform = (price * PLATFORM_BPS) / BPS_DENOMINATOR;
  const expectedCreator = price - expectedPlatform;

  const creatorDelta =
    balanceFor(post_, post.creator.solanaAddress, creatorAtaIdx) -
    balanceFor(pre, post.creator.solanaAddress, creatorAtaIdx);
  const platformDelta =
    balanceFor(post_, VELORAN_TREASURY.toBase58(), platformAtaIdx) -
    balanceFor(pre, VELORAN_TREASURY.toBase58(), platformAtaIdx);

  if (creatorDelta < expectedCreator) {
    return {
      ok: false,
      status: 400,
      error: `Creator received ${creatorDelta} micro-USDC, expected >= ${expectedCreator}`,
    };
  }
  if (platformDelta < expectedPlatform) {
    return {
      ok: false,
      status: 400,
      error: `Platform received ${platformDelta} micro-USDC, expected >= ${expectedPlatform}`,
    };
  }
  if (creatorDelta + platformDelta < price) {
    return {
      ok: false,
      status: 400,
      error: "Combined creator + platform credit is less than the price",
    };
  }

  // Claimed payer must actually be the source of funds.
  if (payerAtaIdx === -1) {
    return {
      ok: false,
      status: 400,
      error: "Claimed payer's USDC account not in transaction",
    };
  }
  const payerPre = balanceFor(pre, expectedPayerAddress, payerAtaIdx);
  const payerPost = balanceFor(post_, expectedPayerAddress, payerAtaIdx);
  if (payerPre - payerPost < price) {
    return {
      ok: false,
      status: 400,
      error: "Claimed payer wallet did not fund this transfer",
    };
  }

  return { ok: true, creatorDelta, platformDelta, price };
}
