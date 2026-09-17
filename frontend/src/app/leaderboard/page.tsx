"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { GraduationCapIcon } from "@/components/GraduationCapIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { shortenAddress } from "@/lib/format";
import { fetchLeaderboard, LeaderboardResponse } from "@/lib/learningApi";

export default function LeaderboardPage() {
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionKey(localStorage.getItem("greencard_session"));
  }, []);

  useEffect(() => {
    fetchLeaderboard(sessionKey)
      .then(setBoard)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load leaderboard."));
  }, [sessionKey]);

  const meInTop = board?.me && board.entries.some((e) => e.rank === board.me!.rank);

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
            Leaderboard
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted">
            Ranked by total XP. Connect a wallet to appear on the board.
          </p>
        </section>

        {error && <p className="text-sm text-muted">{error}</p>}

        {!error && !board && <p className="text-sm text-muted">Loading leaderboard...</p>}

        {board && board.entries.length === 0 && (
          <p className="text-sm text-muted">No wallet-connected players yet. Be the first.</p>
        )}

        {board && board.entries.length > 0 && (
          <div className="hover-card overflow-hidden rounded-2xl">
            {board.entries.map((entry) => {
              const isMe = board.me?.rank === entry.rank;
              return (
                <div
                  key={entry.rank}
                  className={[
                    "flex items-center justify-between gap-4 border-b border-card-border px-5 py-4 last:border-b-0",
                    isMe ? "bg-foreground text-background" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-6 text-sm font-bold tabular-nums">{entry.rank}</span>
                    <div>
                      <p className="font-mono text-sm">{shortenAddress(entry.wallet_address)}</p>
                      <p
                        className={`text-xs uppercase tracking-[0.15em] ${
                          isMe ? "text-background/70" : "text-muted"
                        }`}
                      >
                        {entry.courses_passed} course{entry.courses_passed === 1 ? "" : "s"} passed
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{entry.xp} XP</span>
                </div>
              );
            })}
          </div>
        )}

        {board?.me && !meInTop && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Your rank
            </p>
            <div className="hover-card flex items-center justify-between gap-4 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-4">
                <span className="w-6 text-sm font-bold tabular-nums">{board.me.rank}</span>
                <div>
                  <p className="font-mono text-sm">{shortenAddress(board.me.wallet_address)}</p>
                  <p className="text-xs uppercase tracking-[0.15em] text-muted">
                    {board.me.courses_passed} course{board.me.courses_passed === 1 ? "" : "s"} passed
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums">{board.me.xp} XP</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
