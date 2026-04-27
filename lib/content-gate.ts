import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signs short HMAC tokens proving "this browser unlocked <X> until <exp>".
 * Stored in an HTTP-only cookie so a page reload still renders unlocked.
 *
 * Two scopes:
 *   - Per-post unlock: payload { slug, exp }. Cookie: vlr_unlock_<slug>.
 *   - Per-creator subscription: payload { sub: creatorId, exp }.
 *     Cookie: vlr_sub_<creatorId>.
 *
 * Format (both): base64url(payload) + "." + base64url(hmac)
 */

const TTL_SECONDS = 60 * 60 * 24 * 7;          // 7 days for per-post unlocks
const MONTHLY_TTL_SECONDS = 60 * 60 * 24 * 30;  // 30 days
const YEARLY_TTL_SECONDS = 60 * 60 * 24 * 365;  // 365 days

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET missing or too short (>= 16 chars)");
  }
  return s;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signUnlockToken(slug: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = b64url(Buffer.from(JSON.stringify({ slug, exp })));
  const sig = b64url(
    createHmac("sha256", getSecret()).update(payload).digest()
  );
  return `${payload}.${sig}`;
}

export function verifyUnlockToken(
  token: string | undefined,
  expectedSlug: string
): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expected = createHmac("sha256", getSecret()).update(payload).digest();
  let provided: Buffer;
  try {
    provided = fromB64url(sig);
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  if (!timingSafeEqual(provided, expected)) return false;

  try {
    const data = JSON.parse(fromB64url(payload).toString("utf8")) as {
      slug?: string;
      exp?: number;
    };
    if (data.slug !== expectedSlug) return false;
    if (typeof data.exp !== "number") return false;
    if (data.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Cookie name scoped to a slug. Shorter than including the full slug. */
export function unlockCookieName(slug: string): string {
  // simple slug → safe cookie suffix (slugs are already [a-z0-9-])
  return `vlr_unlock_${slug}`;
}

export const UNLOCK_COOKIE_MAX_AGE = TTL_SECONDS;

// ---------------------------------------------------------------------------
// Subscription tokens (creator-scoped, longer TTL)
// ---------------------------------------------------------------------------

export type SubscriptionPlan = "monthly" | "yearly";

/**
 * Sign a token proving "this browser is subscribed to <creatorId> until <exp>".
 * The TTL matches the plan length so the cookie naturally re-locks at expiry,
 * mirroring the on-chain `Subscription.expiresAt` row.
 */
export function signSubscriptionToken(
  creatorId: string,
  plan: SubscriptionPlan
): string {
  const ttl = plan === "yearly" ? YEARLY_TTL_SECONDS : MONTHLY_TTL_SECONDS;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const payload = b64url(Buffer.from(JSON.stringify({ sub: creatorId, exp })));
  const sig = b64url(
    createHmac("sha256", getSecret()).update(payload).digest()
  );
  return `${payload}.${sig}`;
}

export function verifySubscriptionToken(
  token: string | undefined,
  expectedCreatorId: string
): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;

  const expected = createHmac("sha256", getSecret()).update(payload).digest();
  let provided: Buffer;
  try {
    provided = fromB64url(sig);
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  if (!timingSafeEqual(provided, expected)) return false;

  try {
    const data = JSON.parse(fromB64url(payload).toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    if (data.sub !== expectedCreatorId) return false;
    if (typeof data.exp !== "number") return false;
    if (data.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Cookie name scoped to a creator's id. */
export function subscriptionCookieName(creatorId: string): string {
  // creatorId is a cuid (always [a-z0-9]) → safe in cookie names directly
  return `vlr_sub_${creatorId}`;
}

export function subscriptionCookieMaxAge(plan: SubscriptionPlan): number {
  return plan === "yearly" ? YEARLY_TTL_SECONDS : MONTHLY_TTL_SECONDS;
}
