/**
 * Client-side encryption for Vaultara.
 *
 * All file bytes are encrypted in the browser with AES-GCM (256-bit) via the
 * WebCrypto API BEFORE anything is uploaded. The storage provider only ever
 * sees ciphertext (AC-8). Nothing here touches the network.
 *
 * Envelope model (Approach A):
 *   - Each file gets a fresh random AES-GCM key `K` + 12-byte IV.
 *   - The file is encrypted with `K`.
 *   - To share, `K` is exported and wrapped to a recipient (handled in share.ts).
 */

const ALGO = "AES-GCM";
const KEY_LENGTH = 256;
const IV_BYTES = 12; // 96-bit nonce, the AES-GCM standard

function getCrypto(): Crypto {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!c || !c.subtle) {
    throw new Error("WebCrypto is not available in this environment.");
  }
  return c;
}

export interface EncryptedPayload {
  /** ciphertext bytes (what gets uploaded to IPFS) */
  ciphertext: Uint8Array;
  /** the AES key, exported as raw bytes, to be wrapped for the owner/recipient */
  rawKey: Uint8Array;
  /** the IV used for this file */
  iv: Uint8Array;
}

/** Generate a fresh random AES-GCM 256-bit key. */
export async function generateFileKey(): Promise<CryptoKey> {
  return getCrypto().subtle.generateKey({ name: ALGO, length: KEY_LENGTH }, true, ["encrypt", "decrypt"]);
}

/** Import raw key bytes back into a CryptoKey. */
export async function importRawKey(raw: Uint8Array): Promise<CryptoKey> {
  return getCrypto().subtle.importKey("raw", raw, { name: ALGO }, true, ["encrypt", "decrypt"]);
}

/** Encrypt arbitrary bytes with a fresh key. Returns ciphertext + the raw key + IV. */
export async function encryptBytes(plaintext: Uint8Array): Promise<EncryptedPayload> {
  const crypto = getCrypto();
  const key = await generateFileKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const ctBuffer = await crypto.subtle.encrypt({ name: ALGO, iv }, key, plaintext);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));

  return { ciphertext: new Uint8Array(ctBuffer), rawKey, iv };
}

/** Decrypt ciphertext with the raw key + IV. Throws if the key/IV/data don't match. */
export async function decryptBytes(ciphertext: Uint8Array, rawKey: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
  const crypto = getCrypto();
  const key = await importRawKey(rawKey);
  const ptBuffer = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return new Uint8Array(ptBuffer);
}

// --- small byte/base64 helpers (browser + node safe) -----------------------

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(binary, "binary").toString("base64");
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
