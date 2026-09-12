import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

/** Local anvil chain for Milestone 3 development (chainId 31337). */
export const localChain = defineChain({
  id: 31337,
  name: "Anvil (local)",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
const useBaseSepolia = configuredChainId === baseSepolia.id;

// Register both chains; ACTIVE_CHAIN selects the default for the UI.
export const wagmiConfig = createConfig({
  chains: [localChain, baseSepolia],
  connectors: [injected()],
  transports: {
    [localChain.id]: http("http://127.0.0.1:8545"),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://sepolia.base.org"),
  },
  ssr: true,
});

export const ACTIVE_CHAIN = useBaseSepolia ? baseSepolia : localChain;
