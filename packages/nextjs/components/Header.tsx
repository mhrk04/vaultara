"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { HardDrive, Wallet, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "~~/components/ui/Button";
import { shortenAddress } from "~~/lib/format";
import { ACTIVE_CHAIN } from "~~/lib/wagmi";

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== ACTIVE_CHAIN.id;
  const injected = connectors[0];

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
          {isConnected ? (
            <>
              <span className="hidden rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 sm:inline">
                {shortenAddress(address)}
              </span>
              <Button variant="ghost" onClick={() => disconnect()} aria-label="Disconnect">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button loading={isPending} onClick={() => injected && connect({ connector: injected })}>
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
