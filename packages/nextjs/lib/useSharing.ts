"use client";

import { useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient, useSignMessage } from "wagmi";
import { driveRegistryAbi, DRIVE_REGISTRY_ADDRESS } from "~~/lib/contract";
import { getStorage } from "~~/lib/storage";
import { deriveShareKeypair, shareKeyMessage, wrapKeyForRecipient, unwrapKeyAsRecipient, type Envelope } from "~~/lib/share";
import { decryptBytes } from "~~/lib/crypto";
import { hexToBytes } from "~~/lib/ownerKey";

/**
 * Cross-user sharing: derive a stable sharing keypair, register the public key,
 * wrap a file key to a recipient, grant onchain, and (recipient side) unwrap +
 * decrypt a shared file.
 */
export function useSharing() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
  const storage = getStorage();

  /** Derive this user's sharing keypair from a wallet signature. */
  const getMyKeypair = useCallback(async () => {
    const sig = await signMessageAsync({ message: shareKeyMessage });
    return deriveShareKeypair(sig);
  }, [signMessageAsync]);

  /** Publish my sharing public key to the directory so others can share with me. */
  const registerMyPubkey = useCallback(async () => {
    if (!address) throw new Error("connect a wallet");
    const kp = await getMyKeypair();
    const res = await fetch("/api/pubkey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, pubkey: kp.pubHex }),
    });
    if (!res.ok) throw new Error("failed to register sharing key");
    return kp;
  }, [address, getMyKeypair]);

  const lookupPubkey = useCallback(async (recipient: string): Promise<string | null> => {
    const res = await fetch(`/api/pubkey?address=${recipient.toLowerCase()}`);
    if (!res.ok) return null;
    const { pubkey } = (await res.json()) as { pubkey: string | null };
    return pubkey;
  }, []);

  /**
   * Share a file with a recipient address.
   * @param rawFileKey the file's AES key (owner obtains this by unwrapping their own record)
   */
  const shareFile = useCallback(
    async (fileId: bigint, recipient: `0x${string}`, rawFileKey: Uint8Array) => {
      if (!walletClient) throw new Error("connect a wallet");
      const recipientPub = await lookupPubkey(recipient);
      if (!recipientPub) {
        throw new Error("Recipient hasn't published a sharing key yet. Ask them to open the app and click 'Enable sharing'.");
      }
      const envelope = await wrapKeyForRecipient(recipientPub, rawFileKey);
      const wrappedKeyCid = await storage.putJson(envelope);

      const hash = await walletClient.writeContract({
        address: DRIVE_REGISTRY_ADDRESS as `0x${string}`,
        abi: driveRegistryAbi,
        functionName: "grantAccess",
        args: [fileId, recipient, wrappedKeyCid],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    },
    [walletClient, publicClient, storage, lookupPubkey],
  );

  const revokeShare = useCallback(
    async (fileId: bigint, grantee: `0x${string}`) => {
      if (!walletClient) throw new Error("connect a wallet");
      const hash = await walletClient.writeContract({
        address: DRIVE_REGISTRY_ADDRESS as `0x${string}`,
        abi: driveRegistryAbi,
        functionName: "revokeAccess",
        args: [fileId, grantee],
      });
      await publicClient?.waitForTransactionReceipt({ hash });
    },
    [walletClient, publicClient],
  );

  /** Recipient path: fetch envelope by CID, unwrap, fetch ciphertext, decrypt, download. */
  const openSharedFile = useCallback(
    async (opts: { cid: string; wrappedKeyCid: string; fileIvHex: string; name: string }) => {
      const kp = await getMyKeypair();
      const envelope = await storage.getJson<Envelope>(opts.wrappedKeyCid);
      const rawKey = await unwrapKeyAsRecipient(kp.privHex, envelope);
      const ciphertext = await storage.getBytes(opts.cid);
      const plaintext = await decryptBytes(ciphertext, rawKey, hexToBytes(opts.fileIvHex));

      const blob = new Blob([plaintext]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = opts.name;
      a.click();
      URL.revokeObjectURL(url);
    },
    [getMyKeypair, storage],
  );

  return { getMyKeypair, registerMyPubkey, lookupPubkey, shareFile, revokeShare, openSharedFile };
}
