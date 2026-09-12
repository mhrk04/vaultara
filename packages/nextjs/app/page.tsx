"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { FolderLock, ShieldCheck, Info } from "lucide-react";
import { Header } from "~~/components/Header";
import { UploadZone } from "~~/components/UploadZone";
import { FileCard } from "~~/components/FileCard";
import { EmptyState } from "~~/components/ui/EmptyState";
import { FileCardSkeleton } from "~~/components/ui/Skeleton";
import { useDrive, type DriveFile } from "~~/lib/useDrive";

export default function Home() {
  const { isConnected } = useAccount();
  const { files, loading, configured, uploadFile, downloadFile, deleteFile } = useDrive();
  const [shareTarget, setShareTarget] = useState<DriveFile | null>(null);

  return (
    <main className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Hero */}
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

        {/* Contract-not-deployed notice (until M4) */}
        {isConnected && !configured && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Contract address not set yet. Deploy <code>DriveRegistry</code> (Milestone 4) and set{" "}
              <code>NEXT_PUBLIC_DRIVE_REGISTRY_ADDRESS</code> to enable upload/list.
            </span>
          </div>
        )}

        {/* State 1: not connected */}
        {!isConnected ? (
          <EmptyState
            icon={<FolderLock className="h-8 w-8" />}
            title="Connect your wallet to open your drive"
            hint="Your files are tied to your address. Nobody else can read them."
          />
        ) : (
          <div className="space-y-6">
            <UploadZone onUpload={uploadFile} disabled={!configured} />

            {/* State 2: loading */}
            {loading ? (
              <div className="space-y-3">
                <FileCardSkeleton />
                <FileCardSkeleton />
              </div>
            ) : files.length === 0 ? (
              /* State 3: empty */
              <EmptyState
                icon={<FolderLock className="h-8 w-8" />}
                title="No files yet — upload your first encrypted file"
                hint="Drop a file above to encrypt and store it."
              />
            ) : (
              /* State 4: populated */
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
          </div>
        )}

        {/* Share dialog placeholder — fully wired in Milestone 4 (ENS + onchain grant) */}
        {shareTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShareTarget(null)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-semibold">Share “{shareTarget.name}”</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Onchain, revocable sharing to an ENS name arrives in Milestone 4 — this dialog will resolve{" "}
                <code>alice.eth</code>, wrap the file key to the recipient, and record the grant onchain.
              </p>
              <button
                className="mt-4 rounded-lg bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
                onClick={() => setShareTarget(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
