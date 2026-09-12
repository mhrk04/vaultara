"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider } from "@privy-io/wagmi";
import { useState, type ReactNode } from "react";
import { baseSepolia } from "wagmi/chains";
import { wagmiConfig, ACTIVE_CHAIN } from "~~/lib/wagmi";
import { ToastProvider } from "~~/components/ui/Toast";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // With Privy configured: embedded-wallet onboarding (email/social) + injected fallback.
  if (PRIVY_APP_ID) {
    return (
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          appearance: { theme: "dark", accentColor: "#6366f1", logo: undefined },
          embeddedWallets: { createOnLogin: "users-without-wallets" },
          defaultChain: ACTIVE_CHAIN,
          supportedChains: [baseSepolia],
          loginMethods: ["email", "wallet"],
        }}
      >
        <QueryClientProvider client={queryClient}>
          <PrivyWagmiProvider config={wagmiConfig}>
            <ToastProvider>{children}</ToastProvider>
          </PrivyWagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    );
  }

  // Fallback: plain wagmi with injected connector (works with no Privy key).
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
