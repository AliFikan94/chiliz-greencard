"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { bindWallet } from "@/lib/rewardApi";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectWalletButton({ sessionKey }: { sessionKey: string | null }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [bindError, setBindError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const boundFor = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!address || !sessionKey || boundFor.current === address) return;

    bindWallet(sessionKey, address)
      .then(() => {
        boundFor.current = address;
        setBindError(null);
      })
      .catch((error) => setBindError(error.message));
  }, [address, sessionKey]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickAway(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [menuOpen]);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-card-border bg-card px-4 py-2 text-sm font-medium text-foreground">
          {shortenAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-xs font-medium text-muted underline underline-offset-2 hover:text-foreground"
        >
          Disconnect
        </button>
        {bindError && <span className="text-xs text-chiliz-red">{bindError}</span>}
      </div>
    );
  }

  const injectedConnector = connectors.find((c) => c.type === "injected");
  const walletConnectConnector = connectors.find((c) => c.type === "walletConnect");

  // No WalletConnect project ID configured - only the browser-extension
  // wallet (MetaMask, etc.) is available, so skip the menu entirely.
  if (!walletConnectConnector) {
    return (
      <button
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        disabled={!injectedConnector || isPending}
        className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-85 disabled:opacity-50"
      >
        {isPending ? "Connecting..." : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((open) => !open)}
        disabled={isPending}
        className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-85 disabled:opacity-50"
      >
        {isPending ? "Connecting..." : "Connect wallet"}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-2xl border border-card-border bg-card shadow-lg">
          <button
            onClick={() => {
              setMenuOpen(false);
              if (injectedConnector) connect({ connector: injectedConnector });
            }}
            disabled={!injectedConnector}
            className="block w-full px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            MetaMask
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              connect({ connector: walletConnectConnector });
            }}
            className="block w-full border-t border-card-border px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-background"
          >
            Socios Wallet
          </button>
        </div>
      )}
    </div>
  );
}
