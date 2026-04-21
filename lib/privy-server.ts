import { PrivyClient } from "@privy-io/server-auth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

if (!appId) throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID");
if (!appSecret || appSecret.startsWith("PASTE_")) {
  console.warn(
    "[privy-server] PRIVY_APP_SECRET not set yet — /api/me will fail until .env.local is filled in."
  );
}

export const privy = new PrivyClient(appId, appSecret ?? "unset");

export async function verifyPrivyToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  try {
    return await privy.verifyAuthToken(token);
  } catch {
    return null;
  }
}
