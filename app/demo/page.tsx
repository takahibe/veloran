import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo · Veloran",
  description:
    "Live hackathon demo walkthrough — what to look for, what's happening on-chain, why it matters.",
};

export default function DemoPage() {
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
          Demo · Solana Frontier 2026
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-semibold leading-tight">
          Veloran in 2 minutes.
        </h1>
        <p className="mt-4 text-lg text-neutral-300 leading-relaxed">
          The payment and access layer for the agent economy. Sellers publish
          paid APIs, datasets, or premium content. Humans and AI agents
          unlock with USDC on Solana — settled on-chain, 95% direct to the
          seller, no facilitator.
        </p>
      </header>

      <Section title="The problem">
        <ul className="space-y-2">
          <Bullet>
            Premium digital resources still sell through Stripe, API keys, or
            forced subscriptions — billing systems built for human checkout.
          </Bullet>
          <Bullet>
            AI agents read content and call APIs all day. Existing rails
            give them no native way to discover a price and pay autonomously.
          </Bullet>
          <Bullet>
            Existing crypto-native attempts (xpay.sh, payai.network) are
            off-chain facilitators that hold the buyer&apos;s funds and take
            a fee. There&apos;s no on-chain split.
          </Bullet>
        </ul>
      </Section>

      <Section title="The solution">
        <ul className="space-y-2">
          <Bullet>
            <strong>One paid endpoint, two payers.</strong> The same URL
            serves a checkout to humans and an x402 challenge to agents.
          </Bullet>
          <Bullet>
            <strong>On-chain settlement.</strong> A custom Anchor program
            (<code className="text-xs">2CtnLfde…2pGcS</code>) splits 95/5 in
            one atomic transaction. Veloran never custodies funds.
          </Bullet>
          <Bullet>
            <strong>Per-call or subscription.</strong> Heavy buyers pay flat;
            casual buyers pay per request.
          </Bullet>
        </ul>
      </Section>

      <Section title="Demo flow (2:30 video)">
        <ol className="space-y-3 list-decimal list-inside text-neutral-300">
          <li>
            <strong>Seller publishes</strong> a paid endpoint at{" "}
            <code>/post/new</code> — title, content (JSON or markdown), price.
          </li>
          <li>
            <strong>Human buyer</strong> opens the URL, signs in via Privy
            (email or Phantom), pays with one click. Content unlocks.
          </li>
          <li>
            <strong>Wallet cutaway</strong> — connect Phantom directly for
            crypto-native buyers (5 seconds).
          </li>
          <li>
            <strong>AI agent</strong> hits the same URL via{" "}
            <code>/api/x402/&lt;slug&gt;</code>, receives HTTP 402 with
            on-chain instructions, signs, re-requests with{" "}
            <code>X-PAYMENT</code> header, parses the JSON response.
          </li>
          <li>
            <strong>Seller dashboard</strong> reflects both unlocks — one
            human, one agent — with Solscan links to the on-chain transactions.
          </li>
          <li>
            <strong>Subscription</strong> — heavy buyer subscribes monthly,
            unlocks every endpoint from this seller without per-call payments.
          </li>
          <li>
            <strong>Solscan proof</strong> — the program account view shows
            every settlement, the 95/5 split visible in token balance changes.
          </li>
        </ol>
      </Section>

      <Section title="What's happening on-chain">
        <p>
          Every payment — human or agent, per-call or subscription — fires a
          single instruction:
        </p>
        <pre className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-xs font-mono text-neutral-200 overflow-x-auto leading-relaxed">
          <code>{`Buyer USDC ATA
        ↓
  pay_for_content(amount)   ← 100 lines of Rust
        ↓
   ╔═════════╤═════════╗
   ║   95%   │   5%    ║
   ║  Seller │Treasury ║
   ╚═════════╧═════════╝`}</code>
        </pre>
        <ul className="mt-4 space-y-2">
          <Bullet>
            One atomic SPL transaction. Two <code>transfer_checked</code> CPIs
            — buyer → seller (95%) and buyer → treasury (5%).
          </Bullet>
          <Bullet>
            The split ratio is enforced in Rust (<code>PLATFORM_BPS = 500</code>).
            We literally cannot take more than 5%.
          </Bullet>
          <Bullet>
            Idempotent verification: re-using the same{" "}
            <code>txSignature</code> returns the same content without
            double-charging.
          </Bullet>
        </ul>
      </Section>

      <Section title="Why this matters for AI agents">
        <ul className="space-y-2">
          <Bullet>
            Agents are real economic actors. They consume APIs, read content,
            call models. None of them have a native payment layer.
          </Bullet>
          <Bullet>
            Subscriptions and API keys assume a long-lived enterprise
            relationship. Agents are episodic — they pay for one request and
            move on.
          </Bullet>
          <Bullet>
            x402 (HTTP 402 Payment Required) shipped as a real protocol in
            2025. Veloran is the on-chain settlement layer underneath it on
            Solana.
          </Bullet>
        </ul>
      </Section>

      <Section title="Why Solana">
        <ul className="space-y-2">
          <Bullet>
            <strong>Sub-cent fees.</strong> $0.05 per-call pricing only works
            if the fee floor is much lower than the price.
          </Bullet>
          <Bullet>
            <strong>Sub-second confirmations.</strong> Agent gets its
            response in the same request cycle.
          </Bullet>
          <Bullet>
            <strong>Custom programs.</strong> Atomic 95/5 split is impossible
            on chains where every payment goes through a hosted facilitator.
          </Bullet>
          <Bullet>
            <strong>USDC liquidity &gt; $5B on Solana.</strong> Real
            stablecoin depth for both sides of the marketplace.
          </Bullet>
        </ul>
      </Section>

      <Section title="The takeaway">
        <p className="text-lg">
          Humans pay with one tap. AI agents pay autonomously. 95% to the
          seller, settled atomically by an on-chain program. Subscriptions
          for heavy buyers. Same primitive, three use cases — paid APIs,
          paid datasets, premium content.
        </p>
        <p className="mt-3 text-neutral-400">
          The agent economy doesn&apos;t need another facilitator. It needs a
          settlement layer. That&apos;s Veloran.
        </p>
      </Section>

      <Section title="Try it yourself">
        <ul className="space-y-2 text-neutral-300">
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>
              Live URL:{" "}
              <Link
                href="/"
                className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
              >
                veloran-paywall-sage.vercel.app
              </Link>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>
              Read the agent docs:{" "}
              <Link
                href="/for-agents"
                className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
              >
                /for-agents
              </Link>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>
              Source on GitHub:{" "}
              <a
                href="https://github.com/takahibe/veloran"
                target="_blank"
                rel="noreferrer"
                className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
              >
                takahibe/veloran
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>
              Anchor program (devnet):{" "}
              <a
                href="https://solscan.io/account/2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS?cluster=devnet"
                target="_blank"
                rel="noreferrer"
                className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
              >
                2CtnLfde…2pGcS on Solscan
              </a>
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
          href="/for-agents"
          className="text-sm text-neutral-500 hover:text-neutral-300"
        >
          Agent docs →
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
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-neutral-100">{title}</h2>
      <div className="mt-3 text-neutral-300 leading-relaxed">{children}</div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
      <span>{children}</span>
    </li>
  );
}
