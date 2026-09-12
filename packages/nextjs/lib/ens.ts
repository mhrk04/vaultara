import { createPublicClient, http, isAddress, type Address } from "viem";
import { mainnet } from "viem/chains";

/**
 * ENS resolution runs against Ethereum mainnet (where ENS lives), independent
 * of the app's Base Sepolia chain. Names resolve to addresses; addresses reverse
 * -resolve to names for display.
 */
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http("https://ethereum-rpc.publicnode.com"),
});

export function looksLikeEns(input: string): boolean {
  return input.trim().toLowerCase().endsWith(".eth");
}

/** Resolve `alice.eth` -> 0x address, or pass through a valid 0x address. */
export async function resolveRecipient(input: string): Promise<Address | null> {
  const value = input.trim();
  if (isAddress(value)) return value as Address;
  if (looksLikeEns(value)) {
    try {
      const addr = await ensClient.getEnsAddress({ name: value.toLowerCase() });
      return addr ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Reverse-resolve an address to an ENS name for display, or null. */
export async function lookupEnsName(address: Address): Promise<string | null> {
  try {
    return await ensClient.getEnsName({ address });
  } catch {
    return null;
  }
}
