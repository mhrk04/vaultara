import type { StorageAdapter } from "./storage";

/**
 * Pinata-backed IPFS storage.
 *  - Uploads go through our /api/ipfs route so PINATA_JWT stays server-side.
 *  - Reads hit the public gateway directly (ciphertext is safe to fetch openly).
 */
const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY
  ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs`
  : "https://gateway.pinata.cloud/ipfs";

async function pin(bytes: Uint8Array): Promise<string> {
  const res = await fetch("/api/ipfs", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: bytes as unknown as BodyInit,
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new Error(error ?? "IPFS upload failed");
  }
  const { cid } = (await res.json()) as { cid: string };
  return cid;
}

async function fetchBytes(cid: string): Promise<Uint8Array> {
  const res = await fetch(`${GATEWAY}/${cid}`);
  if (!res.ok) throw new Error(`IPFS fetch failed for ${cid}`);
  return new Uint8Array(await res.arrayBuffer());
}

export const pinataStorage: StorageAdapter = {
  async putBytes(bytes) {
    return pin(bytes);
  },
  async getBytes(cid) {
    return fetchBytes(cid);
  },
  async putJson(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    return pin(bytes);
  },
  async getJson<T>(cid: string) {
    const bytes = await fetchBytes(cid);
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  },
};
