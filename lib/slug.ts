// Turn a post title into a URL-safe slug + short random suffix for uniqueness.
export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")          // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const suffix = Math.random().toString(36).slice(2, 7); // 5 chars
  return `${base || "post"}-${suffix}`;
}

// Convert a USD string like "0.50" → micro-USDC integer (500000).
// USDC has 6 decimals on Solana.
export function usdToMicroUsdc(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) return null;
  const asNumber = Number(trimmed);
  if (!Number.isFinite(asNumber) || asNumber <= 0) return null;
  return Math.round(asNumber * 1_000_000);
}

export function microUsdcToUsd(micro: number): string {
  return (micro / 1_000_000).toFixed(2);
}
