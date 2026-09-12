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

  try {
    const bytes = new Uint8Array(await req.arrayBuffer());
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
