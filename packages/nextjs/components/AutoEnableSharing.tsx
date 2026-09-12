"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useSharing } from "~~/lib/useSharing";
import { useToast } from "~~/components/ui/Toast";

/**
 * Auto-publishes the user's sharing public key shortly after login, so others
 * can share files to them without a manual "Enable sharing" click.
 *
 * Deriving the key needs ONE wallet signature (WebCrypto can't derive it
 * otherwise). We:
 *   - skip if we've already registered this address on this device (localStorage flag)
 *   - skip if the directory already has a key for this address
 *   - otherwise prompt the single signature once, then never again
 */
export function AutoEnableSharing() {
  const { address, isConnected } = useAccount();
  const { registerMyPubkey, lookupPubkey } = useSharing();
  const { push } = useToast();
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (attempted.current === address) return; // once per session per address
    attempted.current = address;

    const flagKey = `sharing-enabled:${address.toLowerCase()}`;
    if (typeof localStorage !== "undefined" && localStorage.getItem(flagKey)) return;

    (async () => {
      try {
        // Already in the directory? Then nothing to do (mark locally and move on).
        const existing = await lookupPubkey(address);
        if (existing) {
          if (typeof localStorage !== "undefined") localStorage.setItem(flagKey, "1");
          return;
        }
        // Not registered yet — publish it (prompts one signature).
        await registerMyPubkey();
        if (typeof localStorage !== "undefined") localStorage.setItem(flagKey, "1");
        push("info", "Sharing enabled — others can now send you files");
      } catch {
        // User may reject the signature; the manual button remains as a fallback.
      }
    })();
  }, [isConnected, address, registerMyPubkey, lookupPubkey, push]);

  return null;
}
