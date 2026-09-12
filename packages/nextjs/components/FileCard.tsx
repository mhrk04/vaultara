"use client";

import { useState } from "react";
import { FileLock2, Download, Trash2, Share2 } from "lucide-react";
import type { DriveFile } from "~~/lib/useDrive";
import { humanSize, relativeTime } from "~~/lib/format";
import { Button } from "~~/components/ui/Button";
import { useToast } from "~~/components/ui/Toast";

interface Props {
  file: DriveFile;
  onDownload: (f: DriveFile) => Promise<void>;
  onDelete: (f: DriveFile) => Promise<void>;
  onShare: (f: DriveFile) => void;
}

export function FileCard({ file, onDownload, onDelete, onShare }: Props) {
  const { push } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const run = async (fn: () => Promise<void>, setBusy: (b: boolean) => void, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      push("success", okMsg);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <FileLock2 className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{file.name}</p>
          <p className="text-xs text-zinc-500">
            {humanSize(file.size)} · {relativeTime(file.createdAt)} · encrypted
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => onShare(file)}>
          <Share2 className="h-4 w-4" /> Share
        </Button>
        <Button
          variant="secondary"
          loading={downloading}
          onClick={() => run(() => onDownload(file), setDownloading, `Decrypted ${file.name}`)}
        >
          <Download className="h-4 w-4" /> Download
        </Button>
        <Button
          variant="ghost"
          loading={deleting}
          onClick={() => run(() => onDelete(file), setDeleting, "File deleted onchain")}
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4 text-revoked" />
        </Button>
      </div>
    </div>
  );
}
