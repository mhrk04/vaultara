import { describe, it, expect } from "vitest";
import { deriveShareKeypair, wrapKeyForRecipient, unwrapKeyAsRecipient } from "./share";

describe("share (ECIES envelope wrapping)", () => {
  it("derives a deterministic keypair from a signature", () => {
    const sig = "0x" + "ab".repeat(65);
    const a = deriveShareKeypair(sig);
    const b = deriveShareKeypair(sig);
    expect(a.privHex).toBe(b.privHex);
    expect(a.pubHex).toBe(b.pubHex);
    expect(a.pubHex.length).toBe(66); // 33 bytes compressed = 66 hex
  });

  it("recipient can unwrap a key wrapped to their public key", async () => {
    const recipient = deriveShareKeypair("0x" + "11".repeat(65));
    const fileKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) fileKey[i] = (i * 7 + 3) % 256;

    const env = await wrapKeyForRecipient(recipient.pubHex, fileKey);
    const unwrapped = await unwrapKeyAsRecipient(recipient.privHex, env);

    expect(Array.from(unwrapped)).toEqual(Array.from(fileKey));
  });

  it("a different recipient cannot unwrap", async () => {
    const recipient = deriveShareKeypair("0x" + "22".repeat(65));
    const attacker = deriveShareKeypair("0x" + "33".repeat(65));
    const fileKey = new Uint8Array(32).fill(9);

    const env = await wrapKeyForRecipient(recipient.pubHex, fileKey);
    await expect(unwrapKeyAsRecipient(attacker.privHex, env)).rejects.toBeDefined();
  });
});
