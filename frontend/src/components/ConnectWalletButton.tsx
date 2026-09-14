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
  const boundFor = useRef<string | null>(null);

  useEffect(() => {
    if (!address || !sessionKey || boundFor.current === address) return;

    bindWallet(sessionKey, address)
      .then(() => {
        boundFor.current = address;
        setBindError(null);
      })
      .catch((error) => setBindError(error.message));
  }, [address, sessionKey]);

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

  const injectedConnector = connectors.find((c) => c.type === "injected") ?? connectors[0];

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
