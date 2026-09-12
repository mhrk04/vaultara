import { NextRequest, NextResponse } from "next/server";

/**
 * Sharing public-key directory (address -> secp256k1 pubkey hex).
 *
 * So an owner can wrap a file key to a recipient, the recipient must first
 * publish their sharing public key. We store the directory as a single JSON
 * object pinned to IPFS via Pinata, tracked by a mutable name (pinList query).
 *
 * This is an MVP directory: a public key is NOT a secret, so storing it openly
 * is fine. Registration is idempotent (re-publishing the same key is a no-op).
 */
export const runtime = "nodejs";

const PINATA_JWT = process.env.PINATA_JWT;
const DIRECTORY_NAME = "decentral-drive-pubkey-directory";

interface Directory {
  [address: string]: string; // lowercased address -> pubkey hex
}

async function loadDirectory(): Promise<{ dir: Directory; cid: string | null }> {
  const res = await fetch(
    `https://api.pinata.cloud/data/pinList?status=pinned&metadata[name]=${DIRECTORY_NAME}&pageLimit=1`,
    { headers: { Authorization: `Bearer ${PINATA_JWT}` } },
  );
  if (!res.ok) return { dir: {}, cid: null };
  const json = (await res.json()) as { rows: { ipfs_pin_hash: string }[] };
  const cid = json.rows?.[0]?.ipfs_pin_hash ?? null;
  if (!cid) return { dir: {}, cid: null };
  const gw = process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "gateway.pinata.cloud";
  const content = await fetch(`https://${gw}/ipfs/${cid}`);
  if (!content.ok) return { dir: {}, cid };
  return { dir: (await content.json()) as Directory, cid };
}

export async function GET(req: NextRequest) {
  if (!PINATA_JWT) return NextResponse.json({ error: "server not configured" }, { status: 500 });
  const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
  const { dir } = await loadDirectory();
  if (address) return NextResponse.json({ pubkey: dir[address] ?? null });
  return NextResponse.json({ directory: dir });
}

export async function POST(req: NextRequest) {
  if (!PINATA_JWT) return NextResponse.json({ error: "server not configured" }, { status: 500 });
  try {
    const { address, pubkey } = (await req.json()) as { address?: string; pubkey?: string };
    if (!address || !pubkey || !/^0x[a-fA-F0-9]{40}$/.test(address) || !/^[a-f0-9]{66}$/.test(pubkey)) {
      return NextResponse.json({ error: "invalid address or pubkey" }, { status: 400 });
    }
    const { dir } = await loadDirectory();
    const key = address.toLowerCase();
    if (dir[key] === pubkey) return NextResponse.json({ ok: true, unchanged: true });

    dir[key] = pubkey;

    const pinRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        pinataContent: dir,
        pinataMetadata: { name: DIRECTORY_NAME },
        pinataOptions: { cidVersion: 1 },
      }),
    });
    if (!pinRes.ok) {
      const t = await pinRes.text();
      return NextResponse.json({ error: `pin failed: ${t.slice(0, 200)}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
