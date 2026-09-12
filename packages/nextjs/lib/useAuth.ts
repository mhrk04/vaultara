"use client";

import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";

const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

/** usePrivy throws if no PrivyProvider is mounted; guard it for the injected-wallet fallback. */
function usePrivySafe() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePrivy();
  } catch {
    return null;
  }
}

/**
 * Single source of truth for "is the user logged in?".
 *
 * When Privy is enabled we key off `privy.authenticated`, NOT wagmi's
 * `isConnected`: on logout Privy's wagmi connector can lag (or restore from
 * cached session on reload), leaving `isConnected === true` while the user is
 * actually logged out. Header and the drive page must agree, or the drive keeps
 * rendering after "Disconnect" instead of the "Log in" screen.
 */
export function useAuth() {
  const { address, isConnected } = useAccount();
  const privy = usePrivySafe();

  const usePrivyState = PRIVY_ENABLED && !!privy;
  const loggedIn = usePrivyState ? !!privy!.authenticated : isConnected;
  const ready = usePrivyState ? !!privy!.ready : true;

  return { loggedIn, ready, address, privyEnabled: PRIVY_ENABLED, privy };
}
