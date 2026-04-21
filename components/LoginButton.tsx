"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LoginButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const router = useRouter();

  // Once authenticated, bounce to the dashboard.
  useEffect(() => {
    if (ready && authenticated) router.push("/dashboard");
  }, [ready, authenticated, router]);

  if (!ready) {
    return (
      <button
        disabled
        className="px-6 py-3 rounded-lg bg-neutral-800 text-neutral-500"
      >
        Loading…
      </button>
    );
  }

  if (authenticated) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition"
        >
          Open dashboard
        </button>
        <button
          onClick={() => logout()}
          className="px-6 py-3 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition"
          title={user?.email?.address ?? user?.id}
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => login()}
      className="px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition"
    >
      Sign in with email
    </button>
  );
}
