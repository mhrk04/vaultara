/**
 * Envelope-key sharing (Approach A) using deterministic secp256k1 keys + ECIES.
 *
 * Each user derives a STABLE secp256k1 keypair from a wallet signature (so it's
 * reproducible on any device, no stored secret). They publish their public key
 * so others can wrap file keys to them.
 *
 * Share file F with recipient R:
 *   1. ephemeral secp256k1 keypair (e, E)
 *   2. shared = ECDH(e, R.pub); AES key = SHA-256(shared)
 *   3. wrap F's raw AES key with AES-GCM under that key
 *   4. envelope = { ephPub: E, iv, data } -> uploaded to IPFS -> CID recorded onchain
 * Recipient reverses: shared = ECDH(R.priv, E); same AES key; unwrap.
 *
 * This is textbook ECIES (ephemeral-static), appropriate and secure for the MVP.
 */

import { secp256k1 } from "@noble/curves/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, hexToBytes } from "./ownerKey";

export const shareKeyMessage =
  "DecentralDrive: derive my sharing key (v1). Only sign this on decentraldrive.app.";

export interface ShareKeypair {
  privHex: string; // 32-byte scalar
  pubHex: string; // 33-byte compressed public key
}

export interface Envelope {
  ephPub: string; // ephemeral compressed pubkey (hex)
  iv: string; // AES-GCM IV (hex)
  data: string; // wrapped file key (hex)
}

function subtle(): SubtleCrypto {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error("WebCrypto unavailable");
  return c.subtle;
}

/** Deterministic secp256k1 keypair from a wallet signature. */
export function deriveShareKeypair(signatureHex: string): ShareKeypair {
  const priv = sha256(hexToBytes(signatureHex)); // 32 bytes, valid scalar w.h.p.
  const pub = secp256k1.getPublicKey(priv, true); // compressed
  return { privHex: bytesToHex(priv), pubHex: bytesToHex(pub) };
}

async function aesKeyFromSecret(secret: Uint8Array): Promise<CryptoKey> {
  const digest = sha256(secret);
  return subtle().importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Wrap raw file-key bytes to a recipient's public key (ECIES). */
export async function wrapKeyForRecipient(recipientPubHex: string, rawFileKey: Uint8Array): Promise<Envelope> {
  const ephPriv = secp256k1.utils.randomPrivateKey();
  const ephPub = secp256k1.getPublicKey(ephPriv, true);
  // ECDH shared point x-coordinate
  const shared = secp256k1.getSharedSecret(ephPriv, hexToBytes(recipientPubHex), true).slice(1);
  const aesKey = await aesKeyFromSecret(shared);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, aesKey, rawFileKey));
  return { ephPub: bytesToHex(ephPub), iv: bytesToHex(iv), data: bytesToHex(data) };
}

/** Recipient unwraps the file key using their private key + the envelope. */
export async function unwrapKeyAsRecipient(recipientPrivHex: string, env: Envelope): Promise<Uint8Array> {
  const shared = secp256k1.getSharedSecret(hexToBytes(recipientPrivHex), hexToBytes(env.ephPub), true).slice(1);
  const aesKey = await aesKeyFromSecret(shared);
  const raw = await subtle().decrypt({ name: "AES-GCM", iv: hexToBytes(env.iv) }, aesKey, hexToBytes(env.data));
  return new Uint8Array(raw);
}
