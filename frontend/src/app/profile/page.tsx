"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { GraduationCapIcon } from "@/components/GraduationCapIcon";
import { GreencardNFT } from "@/components/GreencardNFT";
import { ThemeToggle } from "@/components/ThemeToggle";
import { shortenAddress } from "@/lib/format";
import { fetchGreencardStatus, GreencardStatus } from "@/lib/rewardApi";
import { touchDailyStreak } from "@/lib/streak";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="hover-card rounded-2xl p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [status, setStatus] = useState<GreencardStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionKey(localStorage.getItem("greencard_session"));
    setStreak(touchDailyStreak());
  }, []);

  useEffect(() => {
    if (!sessionKey) return;
    fetchGreencardStatus(sessionKey)
      .then(setStatus)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile."));
  }, [sessionKey]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-6 md:px-10 md:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCapIcon className="h-7 w-7" />
            <span className="text-xs font-semibold tracking-[0.2em]">CHILIZ ACADEMY</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectWalletButton sessionKey={sessionKey} />
          </div>
        </header>

        <section className="py-10">
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.03em] md:text-4xl">
            Your profile
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">
            {status?.wallet_address
              ? shortenAddress(status.wallet_address)
              : "Connect a wallet to save your progress on-chain."}
          </p>
        </section>

        {error && <p className="text-sm text-muted">{error}</p>}
        {!error && !status && <p className="text-sm text-muted">Loading profile...</p>}

        {status && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile label="Total XP" value={String(status.xp)} />
              <StatTile
                label="Courses passed"
                value={`${status.courses_passed}/${status.total_courses}`}
              />
              <StatTile label="Daily streak" value={streak ? `${streak}` : "-"} />
            </div>

            <section className="py-10">
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
                Your Greencard
              </h2>
              <GreencardNFT
                walletAddress={status.wallet_address}
                coursesPassed={status.courses_passed}
                totalCourses={status.total_courses}
                unlocked={!!status.voucher}
              />
            </section>

            <Link
              href="/leaderboard"
              className="mt-2 inline-block text-sm font-semibold text-foreground underline underline-offset-2"
            >
              See the leaderboard →
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
