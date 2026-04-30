import Link from "next/link";
import { LoginButton } from "@/components/LoginButton";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-32 h-[480px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.18),transparent_60%)]"
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-violet-400">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
            Veloran · Solana devnet
          </p>
          <h1 className="mt-8 text-5xl sm:text-6xl font-semibold leading-[1.05] tracking-tight">
            The payment and access layer for the{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              agent economy
            </span>
            .
          </h1>
          <p className="mt-6 text-lg text-neutral-400 leading-relaxed max-w-2xl mx-auto">
            Sell APIs, datasets, and premium content that humans and AI agents
            unlock with USDC on Solana.
            <br className="hidden sm:block" />
            <span className="text-neutral-300">
              95% direct to you, settled on-chain
            </span>{" "}
            by an Anchor program. No facilitator. No custody. No KYC.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <LoginButton />
            <Link
              href="/for-agents"
              className="px-6 py-3 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition"
            >
              For agents →
            </Link>
            <a
              href="#how"
              className="px-6 py-3 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition"
            >
              How it works ↓
            </a>
          </div>
          <p className="mt-12 text-xs text-neutral-600">
            Built for the Solana Frontier hackathon · May 2026
          </p>
        </div>
      </section>

      {/* Feature row — three differentiators */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          <Feature
            icon={<CoinsIcon />}
            title="On-chain settlement"
            body="A Solana Anchor program enforces the 95/5 split atomically. Sellers get paid directly — no facilitator custody, no clearing period, no platform lock-in."
          />
          <Feature
            icon={<RobotIcon />}
            title="One URL, two payers"
            body="Humans sign in with email or Phantom, pay with one tap. AI agents hit the same URL, receive an x402 challenge, sign the transaction, parse the response."
          />
          <Feature
            icon={<BoltIcon />}
            title="Per-call or subscription"
            body="Charge per request — $0.05, $0.50, $5 — or open a monthly tier so heavy buyers pay flat. Same on-chain primitive, different durations."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-6 pb-28 scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-400 text-center">
            How it works
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold text-center">
            From idea to paid endpoint in three steps.
          </h2>

          <ol className="mt-12 space-y-6">
            <Step
              n={1}
              title="Sign in with email or wallet"
              body="Privy creates an embedded Solana wallet automatically — or connect Phantom directly. No seed phrase, no extension required for buyers."
            />
            <Step
              n={2}
              title="Publish your endpoint, set a USDC price"
              body="Drop in your API response, dataset payload, or analyst write-up. Set a per-call price ($0.05–$5) or open a monthly subscription. You get a shareable link in seconds."
            />
            <Step
              n={3}
              title="Humans pay one tap. Agents pay autonomously."
              body="Visitors see a checkout. AI agents see HTTP 402 with on-chain payment instructions, sign the transaction, parse the response. Every settlement is provable on Solscan."
            />
          </ol>
        </div>
      </section>

      {/* Use cases */}
      <section id="use-cases" className="px-6 pb-28 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-400 text-center">
            Use cases
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold text-center">
            What you can sell on Veloran.
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <UseCase
              tag="Paid API"
              title="Per-call API endpoints"
              body="Trade signals, on-chain analytics, model inference. Humans hit a checkout, agents hit x402. The same endpoint serves both."
              example="/api/v1/sol-alpha-signal · $0.05 per call"
            />
            <UseCase
              tag="Paid file"
              title="One-shot dataset access"
              body="Sell a CSV, JSON, or PDF as a single paid download. Buyer pays, downloads, done. No mailing list, no monthly billing."
              example="quarterly-research.pdf · $5 one-time"
            />
            <UseCase
              tag="Premium content"
              title="Analyst-grade writing"
              body="Long-form analysis, structured reports, gated newsletters. Subscribers unlock everything from one creator with a single monthly payment."
              example="$5/month · all posts unlocked"
            />
          </div>
        </div>
      </section>

      {/* Why now */}
      <section id="why-now" className="px-6 pb-28 scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-400 text-center">
            Why now
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold text-center">
            AI agents need a way to pay.
          </h2>
          <ul className="mt-10 space-y-3 text-neutral-300">
            <Bullet>
              Agents already read APIs and content all day. None of them pay
              for it.
            </Bullet>
            <Bullet>
              Existing rails — Stripe, API keys, monthly subscriptions — are
              shaped for human checkout, not autonomous buyers.
            </Bullet>
            <Bullet>
              x402 (HTTP 402 Payment Required) shipped as a real protocol in
              2025. The wire is ready; the on-chain settlement layer is not.
            </Bullet>
            <Bullet>
              Veloran is the on-chain settlement layer for paid endpoints —
              not a facilitator that sits in the middle.
            </Bullet>
          </ul>
        </div>
      </section>

      {/* Why Solana */}
      <section id="why-solana" className="px-6 pb-28 scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-400 text-center">
            Why Solana
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold text-center">
            Micropayments only work where fees and latency don't.
          </h2>
          <ul className="mt-10 space-y-3 text-neutral-300">
            <Bullet>
              Sub-cent transaction fees make $0.05 per-call pricing
              economical.
            </Bullet>
            <Bullet>
              Sub-second confirmations mean an agent gets its response in the
              same request cycle.
            </Bullet>
            <Bullet>
              USDC supply on Solana &gt; $5B — deep stablecoin liquidity for
              buyers and sellers.
            </Bullet>
            <Bullet>
              Every payment is publicly auditable on Solscan. Trustless by
              construction.
            </Bullet>
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 pb-28">
        <div className="max-w-3xl mx-auto rounded-2xl border border-violet-700/30 bg-gradient-to-br from-violet-950/30 via-neutral-900/40 to-neutral-900/40 p-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Publish your first paid endpoint.
          </h2>
          <p className="mt-3 text-neutral-400">
            Devnet only · USDC test tokens, not real funds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <LoginButton />
            <Link
              href="/for-agents"
              className="px-6 py-3 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition"
            >
              Read the agent docs →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-900/80 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
          <p>
            <span className="text-violet-400">Veloran</span> — Payment and
            access layer for the agent economy.
          </p>
          <p className="flex items-center gap-3">
            <Link
              href="/for-agents"
              className="hover:text-neutral-400 underline underline-offset-2"
            >
              Docs
            </Link>
            <Link
              href="/demo"
              className="hover:text-neutral-400 underline underline-offset-2"
            >
              Demo
            </Link>
            <a
              href="https://github.com/takahibe/veloran"
              className="hover:text-neutral-400 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Source
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 hover:border-neutral-700 transition">
      <div className="h-10 w-10 rounded-lg bg-violet-600/15 text-violet-300 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-5 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="shrink-0 h-9 w-9 rounded-full border border-violet-700/40 bg-violet-950/30 text-violet-300 flex items-center justify-center text-sm font-medium">
        {n}
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-neutral-400 leading-relaxed">{body}</p>
      </div>
    </li>
  );
}

function UseCase({
  tag,
  title,
  body,
  example,
}: {
  tag: string;
  title: string;
  body: string;
  example: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 hover:border-neutral-700 transition flex flex-col">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-300">
        {tag}
      </p>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed flex-1">
        {body}
      </p>
      <p className="mt-4 text-xs font-mono text-neutral-500 border-t border-neutral-800 pt-3">
        {example}
      </p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed">
      <span className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-violet-400" />
      <span>{children}</span>
    </li>
  );
}

function CoinsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="M15.5 7.5a6 6 0 1 1-6 13" />
      <path d="M7 9h4" />
      <path d="M9 7v4" />
    </svg>
  );
}

function RobotIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M12 4v4" />
      <circle cx="9" cy="13" r="1" />
      <circle cx="15" cy="13" r="1" />
      <path d="M9 17h6" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}
