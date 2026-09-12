"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { FolderLock, ShieldCheck, KeyRound } from "lucide-react";
import { Header } from "~~/components/Header";
import { UploadZone } from "~~/components/UploadZone";
import { FileCard } from "~~/components/FileCard";
import { ShareDialog } from "~~/components/ShareDialog";
import { AccessLog } from "~~/components/AccessLog";
import { SharedWithMe } from "~~/components/SharedWithMe";
import { AutoEnableSharing } from "~~/components/AutoEnableSharing";
import { EmptyState } from "~~/components/ui/EmptyState";
import { FileCardSkeleton } from "~~/components/ui/Skeleton";
import { Button } from "~~/components/ui/Button";
import { useToast } from "~~/components/ui/Toast";
import { useDrive, type DriveFile } from "~~/lib/useDrive";
import { useSharing } from "~~/lib/useSharing";

export default function Home() {
  const { isConnected } = useAccount();
  const { push } = useToast();
  const { files, loading, uploadFile, downloadFile, deleteFile, getFileRawKeyAndIv } = useDrive();
  const { registerMyPubkey } = useSharing();
  const [shareTarget, setShareTarget] = useState<DriveFile | null>(null);
  const [enabling, setEnabling] = useState(false);

  const enableSharing = async () => {
    setEnabling(true);
    try {
      await registerMyPubkey();
      push("success", "Sharing enabled — others can now grant files to you");
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not enable sharing");
    } finally {
      setEnabling(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Header />
      <AutoEnableSharing />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <section className="mb-8">
          <h1 className="text-xl font-semibold text-zinc-50">Your encrypted drive</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Files are encrypted in your browser before they ever leave your device. Sharing is a revocable, auditable
            grant recorded onchain and addressed to an ENS name.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-granted" /> AES-GCM client-side encryption
            </span>
            <span className="inline-flex items-center gap-1">
              <FolderLock className="h-4 w-4 text-accent" /> Ciphertext on IPFS, ownership onchain
            </span>
          </div>
        </section>

        {!isConnected ? (
          <EmptyState
            icon={<FolderLock className="h-8 w-8" />}
            title="Log in to open your drive"
            hint="Your files are tied to your address. Nobody else can read them."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left: files */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">
                  {files.length} file{files.length === 1 ? "" : "s"}
                </span>
                {/* Sharing auto-enables on login; this is a manual re-trigger fallback. */}
                <button
                  onClick={enableSharing}
                  disabled={enabling}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                  title="Re-publish your sharing key (usually automatic)"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {enabling ? "Enabling…" : "Sharing enabled"}
                </button>
              </div>

              <UploadZone onUpload={uploadFile} />

              {loading ? (
                <div className="space-y-3">
                  <FileCardSkeleton />
                  <FileCardSkeleton />
                </div>
              ) : files.length === 0 ? (
                <EmptyState
                  icon={<FolderLock className="h-8 w-8" />}
                  title="No files yet — upload your first encrypted file"
                  hint="Drop a file above to encrypt and store it."
                />
              ) : (
                <div className="space-y-3">
                  {files.map((f) => (
                    <FileCard
                      key={f.fileId.toString()}
                      file={f}
                      onDownload={downloadFile}
                      onDelete={deleteFile}
                      onShare={setShareTarget}
                    />
                  ))}
                </div>
              )}

              {/* Files others have shared with this account */}
              <SharedWithMe />
            </div>

            {/* Right: live access log (headline) */}
            <AccessLog />
          </div>
        )}

        {shareTarget && (
          <ShareDialog file={shareTarget} getFileRawKeyAndIv={getFileRawKeyAndIv} onClose={() => setShareTarget(null)} />
        )}
      </div>
    </main>
  );
}
