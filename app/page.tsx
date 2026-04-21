import { LoginButton } from "@/components/LoginButton";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl w-full text-center space-y-8">
        <p className="text-sm uppercase tracking-[0.2em] text-violet-400">
          Veloran
        </p>
        <h1 className="text-5xl sm:text-6xl font-semibold leading-tight">
          Paywall any post in{" "}
          <span className="text-violet-400">30 seconds</span>.
        </h1>
        <p className="text-lg text-neutral-400">
          Creators set a price in USDC. Humans and AI agents auto-pay to
          unlock. 95% to you, 5% to us — split on-chain on Solana. No Substack
          lock-in, no Stripe fees, no KYC.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <LoginButton />
          <a
            href="#how"
            className="px-6 py-3 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition"
          >
            How it works
          </a>
        </div>
        <p className="text-xs text-neutral-500 pt-8">
          Devnet preview · Solana Frontier hackathon build
        </p>
      </div>
    </main>
  );
}
