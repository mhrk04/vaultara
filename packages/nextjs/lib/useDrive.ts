"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useSignMessage } from "wagmi";
import { driveRegistryAbi, DRIVE_REGISTRY_ADDRESS, isContractConfigured } from "~~/lib/contract";
import { encryptBytes, decryptBytes } from "~~/lib/crypto";
import { getStorage } from "~~/lib/storage";
import { deriveOwnerKey, ownerKeyMessage, wrapUnderOwnerKey, unwrapUnderOwnerKey, bytesToHex, hexToBytes } from "~~/lib/ownerKey";

export interface DriveFile {
  fileId: bigint;
  owner: string;
  cid: string;
  name: string;
  size: number;
  createdAt: number;
  exists: boolean;
}

/** Wrapped-key record stored alongside the blob (owner's own re-access, M3). */
interface KeyRecord {
  ownerWrap: { iv: string; data: string };
  fileIv: string; // AES-GCM IV for the file ciphertext
}

export function useDrive() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
  const storage = getStorage();

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const configured = isContractConfigured();

  const loadFiles = useCallback(async () => {
    if (!address || !publicClient || !configured) {
      setFiles([]);
      return;
    }
    setLoading(true);
    try {
      const ids = (await publicClient.readContract({
        address: DRIVE_REGISTRY_ADDRESS as `0x${string}`,
        abi: driveRegistryAbi,
        functionName: "getOwnerFileIds",
        args: [address],
      })) as bigint[];

      const metas = await Promise.all(
        ids.map(async (id) => {
          const m = (await publicClient.readContract({
            address: DRIVE_REGISTRY_ADDRESS as `0x${string}`,
            abi: driveRegistryAbi,
            functionName: "getFile",
            args: [id],
          })) as { owner: string; cid: string; name: string; size: bigint; createdAt: bigint; exists: boolean };
          return {
            fileId: id,
            owner: m.owner,
            cid: m.cid,
            name: m.name,
            size: Number(m.size),
            createdAt: Number(m.createdAt),
            exists: m.exists,
          } as DriveFile;
        }),
      );
      setFiles(metas.filter((m) => m.exists));
    } finally {
      setLoading(false);
    }
  }, [address, publicClient, configured]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  /** Encrypt a file, upload ciphertext + wrapped key, register onchain. */
  const uploadFile = useCallback(
    async (file: File) => {
      if (!walletClient || !address) throw new Error("Connect a wallet first");
      if (!configured) throw new Error("Contract address not configured (deploy in Milestone 4)");

      // 1. read + encrypt in the browser
      const plaintext = new Uint8Array(await file.arrayBuffer());
      const { ciphertext, rawKey, iv } = await encryptBytes(plaintext);

      // 2. upload ciphertext only
      const cid = await storage.putBytes(ciphertext);

      // 3. wrap the file key under the owner's derived key so they can re-open it
      const signature = await signMessageAsync({ message: ownerKeyMessage });
      const ownerKey = await deriveOwnerKey(signature);
      const ownerWrap = await wrapUnderOwnerKey(ownerKey, rawKey);
      const keyRecord: KeyRecord = { ownerWrap, fileIv: bytesToHex(iv) };
      const keyRecordId = await storage.putJson(keyRecord);

      // store a pointer from cid -> keyRecordId locally (M4 moves this into share flow)
      if (typeof localStorage !== "undefined") localStorage.setItem(`keyrec:${cid}`, keyRecordId);

      // 4. register onchain
      const hash = await walletClient.writeContract({
        address: DRIVE_REGISTRY_ADDRESS as `0x${string}`,
        abi: driveRegistryAbi,
        functionName: "registerFile",
        args: [cid, file.name, BigInt(plaintext.length)],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      await loadFiles();
    },
    [walletClient, address, publicClient, storage, signMessageAsync, configured, loadFiles],
  );

  /** Fetch ciphertext, unwrap key, decrypt, and trigger a download of the original file. */
  const downloadFile = useCallback(
    async (f: DriveFile) => {
      const keyRecordId = typeof localStorage !== "undefined" ? localStorage.getItem(`keyrec:${f.cid}`) : null;
      if (!keyRecordId) throw new Error("Key record not found on this device");
      const keyRecord = await storage.getJson<KeyRecord>(keyRecordId);

      const signature = await signMessageAsync({ message: ownerKeyMessage });
      const ownerKey = await deriveOwnerKey(signature);
      const rawKey = await unwrapUnderOwnerKey(ownerKey, keyRecord.ownerWrap.iv, keyRecord.ownerWrap.data);

      const ciphertext = await storage.getBytes(f.cid);
      const plaintext = await decryptBytes(ciphertext, rawKey, hexToBytes(keyRecord.fileIv));

      const blob = new Blob([plaintext]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      a.click();
      URL.revokeObjectURL(url);
    },
    [storage, signMessageAsync],
  );

  const deleteFile = useCallback(
    async (f: DriveFile) => {
      if (!walletClient) throw new Error("Connect a wallet first");
      const hash = await walletClient.writeContract({
        address: DRIVE_REGISTRY_ADDRESS as `0x${string}`,
        abi: driveRegistryAbi,
        functionName: "deleteFile",
        args: [f.fileId],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
      await loadFiles();
    },
    [walletClient, publicClient, loadFiles],
  );

  return { files, loading, configured, uploadFile, downloadFile, deleteFile, reload: loadFiles };
}
