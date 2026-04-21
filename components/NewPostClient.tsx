"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function NewPostClient() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState("");
  const [content, setContent] = useState("");
  const [priceUsd, setPriceUsd] = useState("0.50");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, preview, content, priceUsd }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something broke");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !authenticated) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-neutral-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
      <Link
        href="/dashboard"
        className="text-sm text-neutral-500 hover:text-neutral-300"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">New paywall</h1>
      <p className="mt-2 text-neutral-400">
        Your content stays private until a reader (human or AI agent) pays in
        USDC.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <Field
          label="Title"
          hint="Shown publicly before payment."
          required
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="April SOL alpha"
            className="field"
            required
            minLength={3}
          />
        </Field>

        <Field
          label="Preview"
          hint="One-line teaser shown to non-paying readers."
          required
        >
          <input
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
            maxLength={240}
            placeholder="Why I'm long SOL into next week's FOMC"
            className="field"
            required
            minLength={5}
          />
        </Field>

        <Field
          label="Gated content"
          hint="Markdown supported. Delivered only after payment."
          required
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="# My thesis..."
            className="field font-mono text-sm"
            required
            minLength={10}
          />
        </Field>

        <Field label="Price (USDC)" hint="e.g. 0.50 for fifty cents." required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
              $
            </span>
            <input
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              inputMode="decimal"
              placeholder="0.50"
              className="field pl-6"
              required
            />
          </div>
        </Field>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-wait text-white font-medium transition"
          >
            {submitting ? "Publishing…" : "Publish paywall"}
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 text-neutral-300"
          >
            Cancel
          </Link>
        </div>
      </form>

      <style jsx>{`
        .field {
          width: 100%;
          border-radius: 0.5rem;
          background: rgba(23, 23, 23, 0.6);
          border: 1px solid #262626;
          padding: 0.625rem 0.875rem;
          color: #f5f5f5;
          outline: none;
          transition: border-color 0.15s;
        }
        .field:focus {
          border-color: #8b5cf6;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-neutral-200">
          {label}
          {required && <span className="text-violet-400 ml-1">*</span>}
        </span>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
