import { Connection, PublicKey } from "@solana/web3.js";

// Circle's official devnet USDC mint
export const USDC_DEVNET_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

const PUBLIC_DEVNET_FALLBACK = "https://api.devnet.solana.com";

function resolveRpcUrl(envValue: string | undefined): string {
  if (!envValue || envValue.includes("PASTE_YOUR_HELIUS_KEY_HERE")) {
    return PUBLIC_DEVNET_FALLBACK;
  }
  return envValue;
}

/** Browser-side RPC URL (public Helius URL or fallback) */
export const PUBLIC_RPC_URL = resolveRpcUrl(
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL
);

/** Server-side RPC URL — same source for now */
export const SERVER_RPC_URL = resolveRpcUrl(
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL
);

let cachedConn: Connection | null = null;
export function getServerConnection(): Connection {
  if (!cachedConn) cachedConn = new Connection(SERVER_RPC_URL, "confirmed");
  return cachedConn;
}
