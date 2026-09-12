import { describe, it, expect } from "vitest";
import { encryptBytes, decryptBytes, base64ToBytes, bytesToBase64 } from "./crypto";

const enc = new TextEncoder();
const dec = new TextDecoder();

describe("crypto (AES-GCM, WebCrypto)", () => {
  it("AC-8: ciphertext differs from plaintext", async () => {
    const plaintext = enc.encode("top secret seed phrase and tax return");
    const { ciphertext } = await encryptBytes(plaintext);
    // Ciphertext must not equal plaintext bytes.
    expect(Buffer.from(ciphertext).equals(Buffer.from(plaintext))).toBe(false);
    expect(ciphertext.length).toBeGreaterThan(0);
  });

  it("AC-8/9: decrypt(encrypt(x)) === x", async () => {
    const plaintext = enc.encode("The quick brown fox jumps over the lazy dog. 🦊");
    const { ciphertext, rawKey, iv } = await encryptBytes(plaintext);
    const roundTrip = await decryptBytes(ciphertext, rawKey, iv);
    expect(dec.decode(roundTrip)).toBe("The quick brown fox jumps over the lazy dog. 🦊");
  });

  it("round-trips arbitrary binary data", async () => {
    const plaintext = new Uint8Array(4096);
    for (let i = 0; i < plaintext.length; i++) plaintext[i] = (i * 31) % 256;
    const { ciphertext, rawKey, iv } = await encryptBytes(plaintext);
    const out = await decryptBytes(ciphertext, rawKey, iv);
    expect(Buffer.from(out).equals(Buffer.from(plaintext))).toBe(true);
  });

  it("wrong key fails to decrypt", async () => {
    const plaintext = enc.encode("secret");
    const { ciphertext, iv } = await encryptBytes(plaintext);
    const wrongKey = new Uint8Array(32).fill(7);
    await expect(decryptBytes(ciphertext, wrongKey, iv)).rejects.toBeDefined();
  });

  it("base64 helpers round-trip", () => {
    const bytes = new Uint8Array([0, 1, 2, 254, 255, 128, 42]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(Array.from(bytes));
  });
});
