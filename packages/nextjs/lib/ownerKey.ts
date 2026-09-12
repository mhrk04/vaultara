/**
 * Owner key derivation.
 *
 * So the owner can re-open their own files on any device, we derive a stable
 * symmetric "owner key" from a signature over a fixed message. The signature is
 * deterministic per wallet, so the derived key is reproducible without storing
 * anything secret. The per-file AES key is wrapped under this owner key and
 * stored with the file record.
 *
 * NOTE (M3): recipient sharing (wrapping to *another* user's key) arrives in M4.
 * This module only handles the owner's own re-access.
 */

const OWNER_KEY_MESSAGE = "DecentralDrive: derive my vault key (v1). Only sign this on decentraldrive.app.";

function subtle(): SubtleCrypto {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error("WebCrypto unavailable");
  return c.subtle;
}

/** Derive a 256-bit AES-GCM owner key from a wallet signature (hex string). */
export async function deriveOwnerKey(signatureHex: string): Promise<CryptoKey> {
  const sigBytes = hexToBytes(signatureHex);
  const digest = await subtle().digest("SHA-256", sigBytes);
  return subtle().importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export const ownerKeyMessage = OWNER_KEY_MESSAGE;

/** Wrap raw bytes (a file's AES key) under the owner key. Returns {iv, data} base64. */
export async function wrapUnderOwnerKey(ownerKey: CryptoKey, rawFileKey: Uint8Array) {
  const c = globalThis.crypto;
  const iv = c.getRandomValues(new Uint8Array(12));
  const wrapped = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, ownerKey, rawFileKey));
  return { iv: bytesToHex(iv), data: bytesToHex(wrapped) };
}

export async function unwrapUnderOwnerKey(ownerKey: CryptoKey, ivHex: string, dataHex: string): Promise<Uint8Array> {
  const iv = hexToBytes(ivHex);
  const data = hexToBytes(dataHex);
  return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv }, ownerKey, data));
}

// hex helpers
export function bytesToHex(b: Uint8Array): string {
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== "string" || hex.length === 0) {
    throw new Error("hexToBytes: expected a non-empty hex string");
  }
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}
