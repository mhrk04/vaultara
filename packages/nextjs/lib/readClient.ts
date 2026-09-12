import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

/**
 * A dedicated read-only client pinned to Base Sepolia. Contract READS use this
 * so they never depend on (or fall back from) the connected wallet's chain.
 * Writes still go through the wallet client (which must be on Base Sepolia).
 */
export const readClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://sepolia.base.org"),
});
