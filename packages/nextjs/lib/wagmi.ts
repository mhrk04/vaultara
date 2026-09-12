import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/**
 * The app targets Base Sepolia (the deployed contract). We register ONLY
 * Base Sepolia so wallet reads/writes can never silently fall back to a local
 * chain (which caused reads to hit 127.0.0.1:8545).
 */
const RPC = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(RPC),
  },
  ssr: true,
});

export const ACTIVE_CHAIN = baseSepolia;
