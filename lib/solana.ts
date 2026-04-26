import { Connection, PublicKey } from "@solana/web3.js";

// Circle's official devnet USDC mint
export const USDC_DEVNET_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// Veloran 95/5-split program — deployed to devnet 2026-04-26
export const VELORAN_PROGRAM_ID = new PublicKey(
  "2CtnLfdePpjitQQLtHrQAsa74RXLiubKfSdJmjy2pGcS"
);

// Veloran treasury wallet (receives the 5% platform cut)
// Hardcoded in the Rust program; must match.
export const VELORAN_TREASURY = new PublicKey(
  "DgGYE7boZTEwrotFsYS9bFYsrgpz8TC76cXCZ8GcFKnP"
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
