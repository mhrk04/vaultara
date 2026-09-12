import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side IPFS upload proxy. Keeps PINATA_JWT off the client.
 * Accepts a raw body (ciphertext bytes or JSON) and pins it to IPFS via Pinata.
 */
export const runtime = "nodejs";

const PINATA_JWT = process.env.PINATA_JWT;

export async function POST(req: NextRequest) {
  if (!PINATA_JWT) {
    return NextResponse.json({ error: "PINATA_JWT not configured on server" }, { status: 500 });
  }

  // Basic abuse guards: require a caller-address header + cap upload size.
  // (Hackathon-grade; a production version would verify a signature / SIWE session.)
  const caller = req.headers.get("x-dd-address");
  if (!caller || !/^0x[a-fA-F0-9]{40}$/.test(caller)) {
    return NextResponse.json({ error: "missing or invalid caller address" }, { status: 401 });
  }

  const MAX_BYTES = 25 * 1024 * 1024; // 25 MB cap
  const lengthHeader = Number(req.headers.get("content-length") ?? 0);
  if (lengthHeader > MAX_BYTES) {
    return NextResponse.json({ error: "file too large (max 25MB)" }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      return NextResponse.json({ error: "file too large (max 25MB)" }, { status: 413 });
    }
    const form = new FormData();
    form.append("file", new Blob([bytes]), "blob.bin");
    // pin options
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
