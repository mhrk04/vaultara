"use client";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL ?? "";

export interface AccessEvent {
  id: string;
  kind: "REGISTER" | "GRANT" | "REVOKE" | "DELETE";
  fileId: string;
  owner: string;
  grantee: string | null;
  fileName: string | null;
  timestamp: string;
  txHash: string;
}

export interface GrantRow {
  id: string;
  grantee: string;
  active: boolean;
  grantedAt: string;
  wrappedKeyCid: string;
  file: { fileId: string; name: string; owner: string; deleted?: boolean };
}

export function subgraphConfigured(): boolean {
  return SUBGRAPH_URL.length > 0;
}

async function query<T>(q: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, variables }),
  });
  if (!res.ok) throw new Error(`subgraph query failed: ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

/**
 * Recent access events relevant to a user (the live Access Log headline).
 * Includes events where the user is the OWNER (their own files) OR the GRANTEE
 * (files shared with them), so a recipient also sees "granted access to you".
 */
export async function fetchAccessLog(user: string): Promise<AccessEvent[]> {
  const u = user.toLowerCase();
  const data = await query<{ owned: AccessEvent[]; received: AccessEvent[] }>(
    `query($u: Bytes!) {
       owned: accessEvents(where: { owner: $u }, orderBy: timestamp, orderDirection: desc, first: 50) {
         id kind fileId owner grantee fileName timestamp txHash
       }
       received: accessEvents(where: { grantee: $u }, orderBy: timestamp, orderDirection: desc, first: 50) {
         id kind fileId owner grantee fileName timestamp txHash
       }
     }`,
    { u },
  );
  // Merge, de-dupe by id, sort by timestamp desc.
  const byId = new Map<string, AccessEvent>();
  for (const e of [...data.owned, ...data.received]) byId.set(e.id, e);
  return Array.from(byId.values())
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 50);
}

/**
 * Active grants a specific grantee currently holds (for "shared with me").
 * Excludes grants whose underlying file has been deleted by the owner.
 */
export async function fetchGrantsForGrantee(grantee: string): Promise<GrantRow[]> {
  const data = await query<{ grants: GrantRow[] }>(
    `query($g: Bytes!) {
       grants(where: { grantee: $g, active: true, file_: { deleted: false } }, orderBy: grantedAt, orderDirection: desc, first: 50) {
         id grantee active grantedAt wrappedKeyCid
         file { fileId name owner deleted }
       }
     }`,
    { g: grantee.toLowerCase() },
  );
  return data.grants;
}

/** Active grants on a specific file (to show/revoke current shares). */
export async function fetchGrantsForFile(fileId: string): Promise<GrantRow[]> {
  const data = await query<{ grants: GrantRow[] }>(
    `query($f: String!) {
       grants(where: { file: $f, active: true }, orderBy: grantedAt, orderDirection: desc) {
         id grantee active grantedAt wrappedKeyCid
         file { fileId name owner }
       }
     }`,
    { f: fileId },
  );
  return data.grants;
}
