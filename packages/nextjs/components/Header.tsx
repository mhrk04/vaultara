"use client";

import { useAccount, useChainId, useSwitchChain, useConnect, useDisconnect } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { HardDrive, Wallet, LogOut, AlertTriangle, Copy, Check } from "lucide-react";
import { Button } from "~~/components/ui/Button";
import { shortenAddress } from "~~/lib/format";
import { ACTIVE_CHAIN } from "~~/lib/wagmi";

/** Address chip with a copy button — handy for email logins whose address isn't obvious. */
function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      title="Copy address"
      className="hidden items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-zinc-100 sm:inline-flex"
    >
      {shortenAddress(address)}
      {copied ? <Check className="h-3.5 w-3.5 text-granted" /> : <Copy className="h-3.5 w-3.5 text-zinc-500" />}
    </button>
  );
}

const PRIVY_ENABLED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function Header() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  // Injected fallback (used when Privy is not configured)
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();

  // Privy (used when configured)
  const privy = usePrivySafe();

  const wrongNetwork = isConnected && chainId !== ACTIVE_CHAIN.id;

  const handleConnect = () => {
    if (PRIVY_ENABLED && privy) privy.login();
    else if (connectors[0]) connect({ connector: connectors[0] });
  };
  const handleDisconnect = () => {
    if (PRIVY_ENABLED && privy) privy.logout();
    else disconnect();
  };

  const connected = PRIVY_ENABLED && privy ? privy.authenticated : isConnected;
  const busy = PRIVY_ENABLED && privy ? !privy.ready : connecting;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-accent" />
          <span className="text-base font-semibold">DecentralDrive</span>
        </div>

        <div className="flex items-center gap-2">
          {wrongNetwork && (
            <Button variant="danger" loading={switching} onClick={() => switchChain({ chainId: ACTIVE_CHAIN.id })}>
              <AlertTriangle className="h-4 w-4" />
              Switch to {ACTIVE_CHAIN.name}
            </Button>
          )}
          {connected ? (
            <>
              {address && <CopyAddress address={address} />}
              <Button variant="ghost" onClick={handleDisconnect} aria-label="Disconnect">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button loading={busy} onClick={handleConnect}>
              <Wallet className="h-4 w-4" />
              {PRIVY_ENABLED ? "Log in" : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

/** usePrivy throws if no PrivyProvider is mounted; guard it for the fallback path. */
function usePrivySafe() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePrivy();
  } catch {
    return null;
  }
}
