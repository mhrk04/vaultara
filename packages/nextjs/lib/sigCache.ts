"use client";

/**
 * Caches deterministic wallet signatures for the session so the app doesn't
 * re-prompt the wallet on every download/share/open. The signatures are over
 * FIXED messages and are deterministic per wallet, so caching them is safe and
 * equivalent to caching the derived key. Cleared when the tab closes.
 */
type SignFn = (args: { message: string }) => Promise<string>;

function key(address: string, message: string): string {
  return `ddsig:${address.toLowerCase()}:${message}`;
}

export async function getCachedSignature(
  address: string,
  message: string,
  signMessageAsync: SignFn,
): Promise<string> {
  const k = key(address, message);
  if (typeof sessionStorage !== "undefined") {
    const cached = sessionStorage.getItem(k);
    if (cached) return cached;
  }
  const sig = await signMessageAsync({ message });
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(k, sig);
  return sig;
}
