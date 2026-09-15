"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { switchChain, waitForTransactionReceipt, writeContract } from "wagmi/actions";

import { rewardDistributorAbi } from "@/lib/rewardDistributorAbi";
import { RewardVoucherResponse } from "@/lib/rewardApi";
import { wagmiConfig } from "@/lib/wagmiConfig";

type SupportedChainId = (typeof wagmiConfig)["chains"][number]["id"];

type Status = "idle" | "requesting-voucher" | "awaiting-signature" | "confirming" | "claimed" | "error";

export function ClaimRewardButton({
  label,
  requestVoucher,
}: {
  label: string;
  requestVoucher: () => Promise<RewardVoucherResponse>;
}) {
  const { isConnected, chainId } = useAccount();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleClaim() {
    setError(null);
    try {
      setStatus("requesting-voucher");
      const voucher = await requestVoucher();
      const voucherChainId = voucher.chainId as SupportedChainId;

      if (chainId !== voucherChainId) {
        await switchChain(wagmiConfig, { chainId: voucherChainId });
      }

      setStatus("awaiting-signature");
      const hash = await writeContract(wagmiConfig, {
        address: voucher.contractAddress as `0x${string}`,
        abi: rewardDistributorAbi,
        functionName: "claim",
        chainId: voucherChainId,
        args: [
          {
            user: voucher.wallet_address as `0x${string}`,
            rewardType: voucher.reward_type,
            token: voucher.token_address as `0x${string}`,
            amount: BigInt(voucher.amount),
            uri: voucher.uri,
            nonce: BigInt(voucher.nonce),
            expiry: BigInt(voucher.expiry),
          },
          voucher.signature as `0x${string}`,
        ],
      });

      setTxHash(hash);
      setStatus("confirming");
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: voucherChainId });
      setStatus("claimed");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Claim failed.");
    }
  }

  if (status === "claimed") {
    return (
      <div className="text-sm font-medium text-success">
        {label} claimed
        {txHash && (
          <>
            {" "}
            ·{" "}
            <a
              className="underline underline-offset-2"
              href={`https://testnet.chiliscan.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              view tx
            </a>
          </>
        )}
      </div>
    );
  }

  const busy = status === "requesting-voucher" || status === "awaiting-signature" || status === "confirming";

  const statusLabel: Record<Status, string> = {
    idle: `Claim ${label}`,
    "requesting-voucher": "Preparing reward...",
    "awaiting-signature": "Confirm in wallet...",
    confirming: "Claiming...",
    claimed: "Claimed",
    error: `Retry claim ${label}`,
  };

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={!isConnected || busy}
        className="rounded-full border border-foreground px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
      >
        {statusLabel[status]}
      </button>
      {!isConnected && <p className="mt-2 text-xs text-muted">Connect a wallet to claim.</p>}
      {error && <p className="mt-2 text-xs text-chiliz-red">{error}</p>}
    </div>
  );
}
