"use client";

import { useEffect, useState, useCallback } from "react";
import { X, UserPlus, ShieldOff, Loader2, CheckCircle2 } from "lucide-react";
import type { Address } from "viem";
import { Button } from "~~/components/ui/Button";
import { Input } from "~~/components/ui/Input";
import { useToast } from "~~/components/ui/Toast";
import type { DriveFile } from "~~/lib/useDrive";
import { useSharing } from "~~/lib/useSharing";
import { resolveRecipient, lookupEnsName } from "~~/lib/ens";
import { fetchGrantsForFile, subgraphConfigured, type GrantRow } from "~~/lib/subgraph";
import { shortenAddress } from "~~/lib/format";

interface Props {
  file: DriveFile;
  getFileRawKeyAndIv: (f: DriveFile) => Promise<{ rawKey: Uint8Array; fileIvHex: string }>;
  onClose: () => void;
}

export function ShareDialog({ file, getFileRawKeyAndIv, onClose }: Props) {
  const { push } = useToast();
  const { shareFile, revokeShare } = useSharing();
  const [recipient, setRecipient] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sharing, setSharing] = useState(false);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  const loadGrants = useCallback(async () => {
    if (!subgraphConfigured()) return;
    setLoadingGrants(true);
    try {
      const rows = await fetchGrantsForFile(file.fileId.toString());
      setGrants(rows);
      // reverse-resolve grantees to ENS names for display (AC-16)
      for (const r of rows) {
        void lookupEnsName(r.grantee as Address).then((n) => {
          if (n) setNames((prev) => ({ ...prev, [r.grantee.toLowerCase()]: n }));
        });
      }
    } catch {
      /* subgraph may still be syncing */
    } finally {
      setLoadingGrants(false);
    }
  }, [file.fileId]);

  useEffect(() => {
    void loadGrants();
  }, [loadGrants]);

  const handleShare = async () => {
    setError(undefined);
    const resolved = await resolveRecipient(recipient);
    if (!resolved) {
      setError("Enter a valid 0x address or a resolvable .eth name");
      return;
    }
    setSharing(true);
    try {
      const { rawKey, fileIvHex } = await getFileRawKeyAndIv(file);
      await shareFile(file.fileId, resolved, rawKey, fileIvHex);
      push("success", `Shared with ${recipient}`);
      setRecipient("");
      await loadGrants();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Share failed");
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (grantee: string) => {
    setRevoking(grantee);
    try {
      await revokeShare(file.fileId, grantee as Address);
      push("success", "Access revoked onchain");
      await loadGrants();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="truncate text-base font-semibold">Share “{file.name}”</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-1 text-xs text-zinc-500">
          Grants a revocable, onchain-recorded key to the recipient. Enter a wallet address or an ENS name.
        </p>
        <p className="mb-3 text-[11px] text-zinc-600">
          Note: revoking removes future access. A recipient who already downloaded a copy keeps that copy — same as
          any real sharing system.
        </p>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Recipient"
              placeholder="alice.eth or 0x…"
              value={recipient}
              error={error}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <Button loading={sharing} onClick={handleShare}>
            <UserPlus className="h-4 w-4" /> Share
          </Button>
        </div>

        {/* Current shares (from the subgraph) with inline revoke */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Current access</p>
          {loadingGrants ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : grants.length === 0 ? (
            <p className="text-sm text-zinc-500">No one else has access yet.</p>
          ) : (
            <ul className="space-y-2">
              {grants.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-granted" />
                    {names[g.grantee.toLowerCase()] ?? shortenAddress(g.grantee)}
                  </span>
                  <Button
                    variant="ghost"
                    loading={revoking === g.grantee}
                    onClick={() => handleRevoke(g.grantee)}
                    aria-label="Revoke"
                  >
                    <ShieldOff className="h-4 w-4 text-revoked" /> Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
