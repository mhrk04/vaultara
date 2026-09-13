import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side IPFS upload proxy. Keeps PINATA_JWT off the client and is the only
 * endpoint exposed to the public internet on a live (Vercel) deployment, so it
 * carries abuse guards: same-origin enforcement, a caller-address header, a size
 * cap, and a lightweight per-address+IP rate limit. No external dependencies.
 *
 * NOTE: the rate-limit state is per-serverless-instance (in-memory). It's a
 * speed bump for casual abuse, not a hard guarantee; a production build would
 * use a shared store (e.g. Upstash) + a SIWE-verified session.
 */
export const runtime = "nodejs";

const PINATA_JWT = process.env.PINATA_JWT;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB cap (was 25MB) — tighter for a public demo

// Naive in-memory rate limiter: max N uploads per key per window.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/** Allow only same-origin requests (blocks other sites POSTing to your proxy). */
function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches often omit Origin; allow
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!PINATA_JWT) {
    return NextResponse.json({ error: "PINATA_JWT not configured on server" }, { status: 500 });
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "cross-origin requests are not allowed" }, { status: 403 });
  }

  const caller = req.headers.get("x-dd-address");
  if (!caller || !/^0x[a-fA-F0-9]{40}$/.test(caller)) {
    return NextResponse.json({ error: "missing or invalid caller address" }, { status: 401 });
  }

  // Rate-limit by caller address + client IP.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(`${caller.toLowerCase()}:${ip}`)) {
    return NextResponse.json({ error: "rate limit exceeded, slow down" }, { status: 429 });
  }

  const lengthHeader = Number(req.headers.get("content-length") ?? 0);
  if (lengthHeader > MAX_BYTES) {
    return NextResponse.json({ error: "file too large (max 10MB)" }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      return NextResponse.json({ error: "file too large (max 10MB)" }, { status: 413 });
    }
    const form = new FormData();
    form.append("file", new Blob([bytes]), "blob.bin");
    form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Pinata error: ${text.slice(0, 200)}` }, { status: 502 });
    }
    const json = (await res.json()) as { IpfsHash: string };
    return NextResponse.json({ cid: json.IpfsHash });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upload failed" }, { status: 500 });
  }
}
