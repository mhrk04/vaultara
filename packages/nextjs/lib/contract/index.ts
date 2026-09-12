import { driveRegistryAbi } from "./abi";

export { driveRegistryAbi };

/** Deployed DriveRegistry address (set after M4 deploy). Empty in local dev. */
export const DRIVE_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_DRIVE_REGISTRY_ADDRESS ?? "") as `0x${string}` | "";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);

export function isContractConfigured(): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(DRIVE_REGISTRY_ADDRESS);
}
