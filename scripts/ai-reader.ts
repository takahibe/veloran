/**
 * Veloran AI reader — autonomous x402 agent.
 *
 * Usage:
 *   AGENT_KEYPAIR_PATH=~/.config/solana/agent.json \
 *   npx tsx scripts/ai-reader.ts <slug-or-url>
 *
 * What it does:
 *   1. GET /api/x402/<slug>  → expects HTTP 402 + payment requirements
 *   2. Builds a pay_for_content tx (95/5 split via the Veloran Anchor program)
 *   3. Signs + sends with the agent's keypair, waits for confirmation
 *   4. Re-GETs the URL with X-PAYMENT header carrying the signature
 *   5. Prints the unlocked content + Solscan link
 *
 * The script speaks the `exact-veloran` x402 scheme. See docs/x402-spike.md.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { buildPayForContentIx } from "../lib/anchor-client";
import {
  PUBLIC_RPC_URL,
  USDC_DEVNET_MINT,
} from "../lib/solana";
import {
  base64urlEncode,
  PaymentRequirements,
  VELORAN_X402_NETWORK,
  VELORAN_X402_SCHEME,
} from "../lib/x402";

// ---------------------------------------------------------------------------
// Pretty terminal helpers
// ---------------------------------------------------------------------------

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  violet: (s: string) => `\x1b[38;5;141m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

function logStep(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

function die(msg: string): never {
  console.error(`${c.red("✗")}  ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const arg = process.argv[2];
if (!arg) {
  console.error(
    `Usage: npx tsx scripts/ai-reader.ts <slug-or-url>\n` +
      `Examples:\n` +
      `  npx tsx scripts/ai-reader.ts why-i-m-long-sol-into-fomc-gli90\n` +
      `  npx tsx scripts/ai-reader.ts http://localhost:3000/api/x402/<slug>`
  );
  process.exit(1);
}

const baseUrl = process.env.VELORAN_BASE_URL ?? "http://localhost:3000";
const targetUrl = arg.startsWith("http")
  ? arg
  : `${baseUrl}/api/x402/${arg}`;

const keypairPath = (
  process.env.AGENT_KEYPAIR_PATH ??
  path.join(os.homedir(), ".config/solana/agent.json")
).replace(/^~/, os.homedir());

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main() {
  console.log(c.violet(c.bold("🤖  Veloran AI reader\n")));

  // Load agent keypair
  let agent: Keypair;
  try {
    const raw = JSON.parse(fs.readFileSync(keypairPath, "utf8")) as number[];
    agent = Keypair.fromSecretKey(Uint8Array.from(raw));
  } catch (e) {
    die(
      `Cannot load keypair from ${keypairPath}. ` +
        `Generate one with: solana-keygen new --outfile ${keypairPath} --no-bip39-passphrase`
    );
  }

  logStep("👤", `Agent address:  ${c.cyan(agent.publicKey.toBase58())}`);
  logStep("🎯", `Target:          ${targetUrl}`);
  console.log();

  // 1. Cold GET → expect 402
  logStep("📡", "Hitting endpoint without payment…");
  const challengeRes = await fetch(targetUrl);
  if (challengeRes.status !== 402) {
    die(
      `Expected HTTP 402, got ${challengeRes.status}: ${await challengeRes.text()}`
    );
  }
  const challenge = (await challengeRes.json()) as {
    x402Version: number;
    accepts: PaymentRequirements[];
  };
  const reqs = challenge.accepts.find(
    (r) =>
      r.scheme === VELORAN_X402_SCHEME && r.network === VELORAN_X402_NETWORK
  );
  if (!reqs) {
    die(
      `Server didn't offer the ${VELORAN_X402_SCHEME} / ${VELORAN_X402_NETWORK} scheme`
    );
  }
  const amountMicro = BigInt(reqs.maxAmountRequired);
  const amountUsd = (Number(amountMicro) / 1_000_000).toFixed(2);
  logStep(
    "💸",
    `Challenge:       $${amountUsd} USDC → 95% creator, 5% platform`
  );
  logStep(
    "📜",
    `Program:         ${c.dim(reqs.extra.programId)}`
  );
  console.log();

  // 2. Build pay_for_content tx
  logStep("🔨", "Building pay_for_content transaction…");
  const reader = agent.publicKey;
  const creator = new PublicKey(reqs.payTo.creator);
  const platform = new PublicKey(reqs.payTo.platform);
  const readerAta = getAssociatedTokenAddressSync(USDC_DEVNET_MINT, reader);
  const creatorAta = new PublicKey(reqs.payTo.creatorAta);
  const platformAta = new PublicKey(reqs.payTo.platformAta);

  const ixs = [
    // Make sure the agent's own USDC ATA exists. The Anchor program
    // requires it to be initialized; if the agent has never received
    // USDC, this is the create call.
    createAssociatedTokenAccountIdempotentInstruction(
      reader,
      readerAta,
      reader,
      USDC_DEVNET_MINT
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      reader,
      creatorAta,
      creator,
      USDC_DEVNET_MINT
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      reader,
      platformAta,
      platform,
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
      amountMicro
    ),
  ];

  const connection = new Connection(PUBLIC_RPC_URL, "confirmed");
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: reader,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  tx.sign([agent]);

  // 3. Submit + confirm
  logStep("🚀", "Submitting to Solana devnet…");
  const signature = await connection.sendTransaction(tx, {
    skipPreflight: false,
    maxRetries: 3,
  });
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  logStep(
    "✅",
    `Confirmed:       ${c.cyan(signature.slice(0, 16))}…`
  );
  logStep(
    "🔍",
    c.dim(
      `Solscan:         https://solscan.io/tx/${signature}?cluster=devnet`
    )
  );
  console.log();

  // 4. Build X-PAYMENT header and re-fetch
  logStep("📦", "Building X-PAYMENT header…");
  const headerJson = JSON.stringify({
    scheme: VELORAN_X402_SCHEME,
    network: VELORAN_X402_NETWORK,
    txSignature: signature,
    payerAddress: reader.toBase58(),
  });
  const xPayment = base64urlEncode(headerJson);

  logStep("🔓", "Re-requesting with X-PAYMENT…");
  const paidRes = await fetch(targetUrl, {
    headers: { "X-PAYMENT": xPayment },
  });
  if (!paidRes.ok) {
    die(`Server rejected paid request (${paidRes.status}): ${await paidRes.text()}`);
  }
  const paidBody = (await paidRes.json()) as {
    ok: boolean;
    title: string;
    content: string;
    txSignature: string;
  };
  console.log();

  // 5. Output
  console.log(c.green(c.bold("━━━ Unlocked content ━━━\n")));
  console.log(c.bold(paidBody.title));
  console.log();
  console.log(paidBody.content);
  console.log();
  console.log(c.green("━━━ End ━━━\n"));

  console.log(
    c.dim(
      `Receipt: ${paidBody.txSignature}\n` +
        `Replay this same signature anytime → server returns the same content idempotently.`
    )
  );
}

main().catch((e) => {
  die(e instanceof Error ? e.message : String(e));
});
