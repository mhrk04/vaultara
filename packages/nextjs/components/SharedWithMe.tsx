"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Inbox, Download, FileLock2 } from "lucide-react";
import { Button } from "~~/components/ui/Button";
import { EmptyState } from "~~/components/ui/EmptyState";
import { FileCardSkeleton } from "~~/components/ui/Skeleton";
import { useToast } from "~~/components/ui/Toast";
import { fetchGrantsForGrantee, subgraphConfigured, type GrantRow } from "~~/lib/subgraph";
import { useSharing } from "~~/lib/useSharing";
import { readClient } from "~~/lib/readClient";
import { driveRegistryAbi, DRIVE_REGISTRY_ADDRESS } from "~~/lib/contract";
import { shortenAddress } from "~~/lib/format";

export function SharedWithMe() {
  const { address } = useAccount();
  const { push } = useToast();
  const { openSharedFile } = useSharing();
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address || !subgraphConfigured()) return;
    setLoading(true);
    try {
      setGrants(await fetchGrantsForGrantee(address));
    } catch {
      /* still syncing */
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10_000);
    return () => clearInterval(t);
  }, [load]);

  const handleOpen = async (g: GrantRow) => {
    setOpening(g.id);
    try {
      // The file's CID lives onchain; read it fresh.
      const meta = (await readClient.readContract({
        address: DRIVE_REGISTRY_ADDRESS as `0x${string}`,
        abi: driveRegistryAbi,
        functionName: "getFile",
        args: [BigInt(g.file.fileId)],
      })) as { cid: string; name: string };

      await openSharedFile({ cid: meta.cid, wrappedKeyCid: g.wrappedKeyCid, name: meta.name || g.file.name });
      push("success", `Decrypted ${meta.name || g.file.name}`);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not open shared file");
    } finally {
      setOpening(null);
    }
  };

  if (!subgraphConfigured()) return null;

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <Inbox className="h-4 w-4 text-accent" /> Shared with me
      </h2>
      {loading && grants.length === 0 ? (
        <FileCardSkeleton />
      ) : grants.length === 0 ? (
        <EmptyState title="Nothing shared with you yet" hint="When someone grants you a file, it appears here." />
      ) : (
        <div className="space-y-3">
          {grants.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <FileLock2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{g.file.name || `File #${g.file.fileId}`}</p>
                  <p className="text-xs text-zinc-500">shared by {shortenAddress(g.file.owner)}</p>
                </div>
              </div>
              <Button variant="secondary" loading={opening === g.id} onClick={() => handleOpen(g)}>
                <Download className="h-4 w-4" /> Open
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
