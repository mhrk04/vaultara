"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { FilePlus2, UserPlus, ShieldOff, Trash2, RefreshCw, Radio } from "lucide-react";
import { fetchAccessLog, subgraphConfigured, type AccessEvent } from "~~/lib/subgraph";
import { shortenAddress, relativeTime } from "~~/lib/format";
import { EmptyState } from "~~/components/ui/EmptyState";
import { Skeleton } from "~~/components/ui/Skeleton";

const meta: Record<AccessEvent["kind"], { icon: React.ReactNode; color: string }> = {
  REGISTER: { icon: <FilePlus2 className="h-4 w-4" />, color: "text-accent" },
  GRANT: { icon: <UserPlus className="h-4 w-4" />, color: "text-granted" },
  REVOKE: { icon: <ShieldOff className="h-4 w-4" />, color: "text-revoked" },
  DELETE: { icon: <Trash2 className="h-4 w-4" />, color: "text-zinc-400" },
};

/** Phrase an event from the viewer's perspective (owner vs. recipient). */
function describe(e: AccessEvent, viewer?: string) {
  const iAmOwner = viewer && e.owner.toLowerCase() === viewer.toLowerCase();
  const g = e.grantee ? shortenAddress(e.grantee) : "";
  const owner = shortenAddress(e.owner);
  switch (e.kind) {
    case "REGISTER":
      return <span><span className="text-zinc-400">You</span> registered a file</span>;
    case "GRANT":
      return iAmOwner ? (
        <span><span className="text-zinc-400">You</span> granted access to <span className="text-zinc-200">{g}</span></span>
      ) : (
        <span><span className="text-zinc-200">{owner}</span> shared a file with <span className="text-zinc-400">you</span></span>
      );
    case "REVOKE":
      return iAmOwner ? (
        <span><span className="text-zinc-400">You</span> revoked <span className="text-zinc-200">{g}</span></span>
      ) : (
        <span><span className="text-zinc-200">{owner}</span> revoked <span className="text-zinc-400">your</span> access</span>
      );
    case "DELETE":
      return <span><span className="text-zinc-400">You</span> deleted a file</span>;
  }
}

export function AccessLog() {
  const { address } = useAccount();
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const configured = subgraphConfigured();

  const load = useCallback(async () => {
    if (!address || !configured) return;
    setLoading(true);
    try {
      setEvents(await fetchAccessLog(address));
    } catch {
      /* still syncing */
    } finally {
      setLoading(false);
    }
  }, [address, configured]);

  useEffect(() => {
    void load();
    // Live-ish: poll every 10s so the log updates after a tx without a manual refresh.
    const t = setInterval(() => void load(), 10_000);
    return () => clearInterval(t);
  }, [load]);

  if (!configured) return null;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Radio className="h-4 w-4 text-granted" /> Live access log
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-normal text-zinc-400">The Graph</span>
        </h2>
        <button onClick={() => void load()} className="text-zinc-500 hover:text-zinc-300" aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && events.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState title="No activity yet" hint="Register or share a file to see it appear here, indexed from onchain events." />
      ) : (
        <ul className="space-y-1.5">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-800/50">
              <span className={meta[e.kind].color}>{meta[e.kind].icon}</span>
              <span className="flex-1 truncate text-zinc-300">
                {describe(e, address)}
                {e.fileName && <span className="text-zinc-200"> · {e.fileName}</span>}
              </span>
              <a
                href={`https://sepolia.basescan.org/tx/${e.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs text-zinc-500 hover:text-accent"
              >
                {relativeTime(Number(e.timestamp))}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
