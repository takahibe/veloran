import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For agents · Veloran",
  description:
    "How AI agents discover, pay for, and unlock Veloran-paywalled resources via x402 + Solana.",
};

export default function ForAgentsPage() {
  return (
    <main className="flex-1 px-6 py-16 max-w-3xl mx-auto w-full">
      <Link
        href="/"
        className="text-xs uppercase tracking-[0.2em] text-violet-400"
      >
        ← Veloran
      </Link>

      <header className="mt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300">
          For agents
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-semibold leading-tight">
          Buy paid resources autonomously.
        </h1>
        <p className="mt-4 text-lg text-neutral-400 leading-relaxed">
          Every Veloran-paid resource speaks the x402 protocol. An autonomous
          agent can hit the URL, receive a payment challenge, sign an on-chain
          transaction in USDC, and consume the response — all in one round
          trip. No accounts, no API keys, no enterprise contract.
        </p>
      </header>

      <Section title="What Veloran is">
        <p>
          Veloran is the on-chain payment and access layer for paid digital
          resources. A seller publishes a paid endpoint with a USDC price.
          Humans buy through a one-tap checkout. Agents buy through HTTP 402
          with on-chain payment instructions.
        </p>
        <p className="mt-3">
          We are <em>not</em> a facilitator. We don&apos;t custody the
          buyer&apos;s funds. The 95/5 split between seller and platform is
          enforced atomically by an Anchor program on Solana. Every settlement
          is auditable on-chain.
        </p>
      </Section>

      <Section title="Human flow vs. agent flow">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
            <p className="text-xs uppercase tracking-wider text-violet-300">
              Human
            </p>
            <ol className="mt-3 space-y-1.5 text-sm text-neutral-300 list-decimal list-inside">
              <li>Visit <code>/p/&lt;slug&gt;</code></li>
              <li>Sign in (email via Privy, or Phantom wallet)</li>
              <li>Click &ldquo;Unlock for $X USDC&rdquo;</li>
              <li>Approve the SPL transfer</li>
              <li>Content unlocks; tx receipt on Solscan</li>
            </ol>
          </div>
          <div className="rounded-xl border border-violet-700/30 bg-violet-950/10 p-5">
            <p className="text-xs uppercase tracking-wider text-violet-300">
              Agent
            </p>
            <ol className="mt-3 space-y-1.5 text-sm text-neutral-300 list-decimal list-inside">
              <li>GET <code>/api/x402/&lt;slug&gt;</code></li>
              <li>Receive HTTP 402 with payment instructions</li>
              <li>Build + sign a Solana <code>pay_for_content</code> tx</li>
              <li>Re-send the GET with <code>X-PAYMENT</code> header</li>
              <li>Receive 200 + content body</li>
            </ol>
          </div>
        </div>
      </Section>

      <Section title="Step 1 — Discover the price (HTTP 402)">
        <p>
          A GET request to a paid resource without a payment header returns
          HTTP 402 with a JSON body describing how to pay:
        </p>
        <CodeBlock
          lang="bash"
          code={`curl -i https://veloran-paywall-sage.vercel.app/api/x402/<slug>`}
        />
        <p className="mt-3">Response (HTTP 402):</p>
        <CodeBlock
          lang="json"
          code={`{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact-veloran",
      "network": "solana-devnet",
      "asset": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      "maxAmountRequired": "500000",
      "resource": "/api/x402/<slug>",
      "description": "Unlock <preview> — pays creator (95%) + Veloran (5%)",
      "payTo": {
        "creator": "<seller pubkey>",
        "creatorAta": "<seller USDC ATA>",
        "platform": "DgGYE7boZTEwrotFsYS9bFYsrgpz8TC76cXCZ8GcFKnP",
        "platformAta": "<platform USDC ATA>"
      },
      "extra": {
        "programId": "2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS",
        "splitBps": { "creator": 9500, "platform": 500 }
      }
    }
  ]
}`}
        />
        <p className="mt-3 text-sm text-neutral-500">
          <strong>Notes:</strong> <code>asset</code> is the USDC mint on
          devnet. <code>maxAmountRequired</code> is in micro-USDC (6 decimals
          — so <code>500000</code> = $0.50). The <code>extra.programId</code>{" "}
          is the deployed Anchor program; agents call its{" "}
          <code>pay_for_content</code> instruction to settle.
        </p>
      </Section>

      <Section title="Step 2 — Build + sign the on-chain payment">
        <p>
          The agent constructs a Solana transaction that calls{" "}
          <code>pay_for_content(amount)</code> on the Veloran program. The
          program transfers USDC from the agent&apos;s ATA to the seller
          (95%) and to the platform treasury (5%) in one atomic instruction.
        </p>
        <CodeBlock
          lang="ts"
          code={`// Pseudocode — full reference impl in scripts/ai-reader.ts
import { Connection, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { buildPayForContentIx } from "@/lib/anchor-client";

const ix = buildPayForContentIx(
  { reader, readerAta, creatorAta, platformAta, mint: USDC_DEVNET_MINT },
  BigInt(challenge.maxAmountRequired)
);

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const { blockhash } = await conn.getLatestBlockhash("confirmed");
const tx = new VersionedTransaction(
  new TransactionMessage({
    payerKey: reader,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message()
);
tx.sign([agentKeypair]);
const sig = await conn.sendTransaction(tx);
await conn.confirmTransaction(sig, "confirmed");`}
        />
      </Section>

      <Section title="Step 3 — Re-request with X-PAYMENT">
        <p>
          The agent sends the same GET again, this time with an{" "}
          <code>X-PAYMENT</code> header — base64url-encoded JSON proving who
          paid and what signature settled it.
        </p>
        <CodeBlock
          lang="json"
          code={`// Decoded payload of the X-PAYMENT header:
{
  "scheme": "exact-veloran",
  "network": "solana-devnet",
  "txSignature": "<base58 signature>",
  "payerAddress": "<agent pubkey>"
}`}
        />
        <CodeBlock
          lang="bash"
          code={`PAYLOAD=$(printf '...' | base64 -w0 | tr '+/' '-_' | tr -d '=')
curl -i -H "X-PAYMENT: $PAYLOAD" https://veloran-paywall-sage.vercel.app/api/x402/<slug>`}
        />
        <p className="mt-3">
          The server re-fetches the on-chain transaction, confirms it invoked
          the Veloran program, verifies the recipient ATA received ≥ 95% and
          the platform ATA received ≥ 5%, and confirms the{" "}
          <code>payerAddress</code> in the header matches the actual funder.
          On success it returns HTTP 200 with the content body and a{" "}
          <code>X-PAYMENT-RESPONSE</code> header carrying a settlement
          receipt.
        </p>
      </Section>

      <Section title="Step 4 — A successful unlock">
        <CodeBlock
          lang="json"
          code={`HTTP/1.1 200 OK
Content-Type: application/json
X-PAYMENT-RESPONSE: <base64url of { "ok": true, "txSignature": "..." }>

{
  "ok": true,
  "title": "SOL alpha signal — 2026-04-29",
  "content": "{ \\"signal\\": \\"long\\", \\"asset\\": \\"SOL\\", ... }",
  "txSignature": "56upSAXh..."
}`}
        />
        <p className="mt-3 text-sm text-neutral-500">
          The same <code>txSignature</code> is idempotent — replay it and you
          get the same content back without paying twice.
        </p>
      </Section>

      <Section title="Why Solana">
        <ul className="space-y-2">
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>Sub-cent fees make $0.05 per-call pricing viable.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>
              Sub-second confirmations let agents complete the round trip in
              one request cycle.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>USDC supply on Solana &gt; $5B — deep liquidity.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>
              Custom programs make atomic payment splits possible. Facilitator
              chains can&apos;t enforce a split without holding funds first.
            </span>
          </li>
        </ul>
      </Section>

      <Section title="Reference implementation">
        <p>
          The repository ships a working autonomous agent script you can read
          and adapt:{" "}
          <a
            href="https://github.com/takahibe/veloran/blob/main/scripts/ai-reader.ts"
            target="_blank"
            rel="noreferrer"
            className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
          >
            <code>scripts/ai-reader.ts</code>
          </a>
          . Run it with:
        </p>
        <CodeBlock
          lang="bash"
          code={`VELORAN_BASE_URL=https://veloran-paywall-sage.vercel.app \\
  AGENT_KEYPAIR_PATH=~/.config/solana/agent.json \\
  npm run ai-reader -- <slug>`}
        />
      </Section>

      <Section title="Demo limitations (be honest)">
        <ul className="space-y-2 text-neutral-300">
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-neutral-600" />
            <span>
              <strong>Devnet only.</strong> Mainnet program audit + deploy
              comes after the hackathon.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-neutral-600" />
            <span>
              <strong>USDC only.</strong> Multi-asset support (SOL, EURC) is
              roadmap, not shipped.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-neutral-600" />
            <span>
              <strong>Custom scheme.</strong> We use{" "}
              <code>scheme: &quot;exact-veloran&quot;</code> instead of the
              official x402{" "}
              <code>exact</code> SVM scheme because the official scheme
              rejects custom-program calls. The 402 envelope and{" "}
              <code>X-PAYMENT</code> header shape are otherwise compatible.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-neutral-600" />
            <span>
              <strong>No spend controls yet.</strong> Budget caps and
              allow-lists for agent buyers are roadmap, not shipped.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-neutral-600" />
            <span>
              <strong>Content payloads are text-shaped today.</strong> Native
              file delivery (CSV, JSON, PDF as binary) is roadmap. JSON-shaped
              text payloads work today.
            </span>
          </li>
        </ul>
      </Section>

      <div className="mt-12 flex items-center justify-between gap-4 border-t border-neutral-800 pt-6">
        <Link
          href="/"
          className="text-sm text-neutral-400 hover:text-violet-300"
        >
          ← Back to landing
        </Link>
        <Link
          href="/demo"
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          Live demo walkthrough →
        </Link>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-neutral-100">{title}</h2>
      <div className="mt-4 text-neutral-300 leading-relaxed">{children}</div>
    </section>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  return (
    <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/60 overflow-hidden">
      <div className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-800">
        {lang}
      </div>
      <pre className="px-4 py-3 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
