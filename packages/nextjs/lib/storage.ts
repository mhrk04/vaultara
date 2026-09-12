/**
 * Storage adapter for encrypted blobs + wrapped keys.
 *
 * We upload ONLY ciphertext here. The interface lets us swap the dev/local
 * implementation (no external keys, used through Milestone 3) for the real
 * Pinata/IPFS implementation in Milestone 4 without touching call sites.
 */

import { bytesToBase64, base64ToBytes } from "./crypto";

export interface StorageAdapter {
  /** Upload ciphertext bytes; returns a content id (CID-like). */
  putBytes(bytes: Uint8Array): Promise<string>;
  /** Fetch ciphertext bytes by id. */
  getBytes(id: string): Promise<Uint8Array>;
  /** Upload a small JSON record (used for wrapped keys); returns an id. */
  putJson(obj: unknown): Promise<string>;
  /** Fetch a JSON record by id. */
  getJson<T = unknown>(id: string): Promise<T>;
}

/**
 * Local dev storage: persists to localStorage (browser) or an in-memory map
 * (node/tests). Ids are content-addressed via a SHA-256 digest so they behave
 * like CIDs (same bytes -> same id). This is a stand-in for IPFS during M3.
 */
const memory = new Map<string, string>();

function store(): { get(k: string): string | null; set(k: string, v: string): void } {
  const ls = (globalThis as unknown as { localStorage?: Storage }).localStorage;
  if (ls) {
    return { get: (k) => ls.getItem(k), set: (k, v) => ls.setItem(k, v) };
  }
  return { get: (k) => memory.get(k) ?? null, set: (k, v) => void memory.set(k, v) };
}

async function contentId(bytes: Uint8Array): Promise<string> {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  const digest = await c!.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `devcid_${hex.slice(0, 46)}`; // CID-like prefix
}

export const localStorageAdapter: StorageAdapter = {
  async putBytes(bytes) {
    const id = await contentId(bytes);
    store().set(`blob:${id}`, bytesToBase64(bytes));
    return id;
  },
  async getBytes(id) {
    const b64 = store().get(`blob:${id}`);
    if (b64 == null) throw new Error(`blob not found: ${id}`);
    return base64ToBytes(b64);
  },
  async putJson(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    const id = await contentId(bytes);
    store().set(`json:${id}`, JSON.stringify(obj));
    return id;
  },
  async getJson<T>(id: string) {
    const raw = store().get(`json:${id}`);
    if (raw == null) throw new Error(`json not found: ${id}`);
    return JSON.parse(raw) as T;
  },
};

/**
 * Chooses the storage adapter. During M3 we always use the local adapter.
 * In M4 this will return a Pinata-backed adapter when PINATA_JWT is configured.
 */
export function getStorage(): StorageAdapter {
  return localStorageAdapter;
}
