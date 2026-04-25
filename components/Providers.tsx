"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { ReactNode, useMemo } from "react";
import { PUBLIC_RPC_URL } from "@/lib/solana";

// Derive a websocket URL from the HTTP RPC URL (Helius + public devnet
// both expose the same path on the wss:// scheme).
function toWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, "ws");
}

export function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  const solanaConnectors = useMemo(() => toSolanaWalletConnectors(), []);

  const solanaRpcs = useMemo(
    () => ({
      "solana:devnet": {
        rpc: createSolanaRpc(PUBLIC_RPC_URL),
        rpcSubscriptions: createSolanaRpcSubscriptions(toWsUrl(PUBLIC_RPC_URL)),
        blockExplorerUrl: "https://solscan.io",
      },
    }),
    []
  );

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#8B5CF6",
          logo: undefined,
          walletChainType: "solana-only",
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
          ethereum: { createOnLogin: "off" },
        },
        solana: { rpcs: solanaRpcs },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
