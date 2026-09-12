"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "~~/components/ui/Button";
import { useToast } from "~~/components/ui/Toast";

export function UploadZone({ onUpload, disabled }: { onUpload: (f: File) => Promise<void>; disabled?: boolean }) {
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      await onUpload(file);
      push("success", `Encrypted & registered ${file.name}`);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) void handle(e.dataTransfer.files?.[0]);
      }}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        dragOver ? "border-accent bg-accent/5" : "border-zinc-800"
      }`}
    >
      <UploadCloud className="h-8 w-8 text-zinc-500" />
      <div>
        <p className="text-sm font-medium text-zinc-200">Drop a file to encrypt & store</p>
        <p className="text-xs text-zinc-500">Encrypted in your browser — the network only sees ciphertext</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0])}
        disabled={disabled}
      />
      <Button loading={busy} disabled={disabled} onClick={() => inputRef.current?.click()}>
        Choose file
      </Button>
    </div>
  );
}
