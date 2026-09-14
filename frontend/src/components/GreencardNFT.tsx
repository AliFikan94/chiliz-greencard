"use client";

import { useRef, useState } from "react";

import { ChiliMascot } from "./ChiliMascot";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function GreencardNFT({
  walletAddress,
  coursesPassed,
  totalCourses,
  unlocked,
  issuedDate,
}: {
  walletAddress: string | null;
  coursesPassed: number;
  totalCourses: number;
  unlocked: boolean;
  issuedDate?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: py * -10, ry: px * 12 });
  }

  function resetTilt() {
    setTilt({ rx: 0, ry: 0 });
  }

  return (
    <div style={{ perspective: "1200px" }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={resetTilt}
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: "preserve-3d",
        }}
        className="relative aspect-[1.6/1] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-6 shadow-[0_20px_60px_-15px_rgba(255,23,68,0.25)] transition-transform duration-150 ease-out"
      >
        {/* Lightweight guilloche-style accents - pure CSS, no image assets. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle at 15% 20%, transparent 0px, transparent 3px, var(--chiliz-red) 4px, transparent 5px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-chiliz-red via-red-700 to-chiliz-red" />

        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
                Chiliz Web3 Academy
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                CHILIZEN <span className="text-chiliz-red">GREENCARD</span>
              </h3>
            </div>
            <ChiliMascot className="h-9 w-9 shrink-0" />
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">Curriculum progress</p>
            <div className="mt-1.5 flex gap-1.5">
              {Array.from({ length: totalCourses }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < coursesPassed ? "bg-chiliz-red" : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">Holder</p>
              <p className="font-mono text-sm text-white">
                {walletAddress ? shortenAddress(walletAddress) : "Not connected"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500">
                {unlocked ? "Issued" : "Status"}
              </p>
              <p
                className={`text-sm font-bold ${
                  unlocked ? "text-success" : "text-zinc-500"
                }`}
              >
                {unlocked ? issuedDate || "ISSUED" : `${coursesPassed}/${totalCourses} LOCKED`}
              </p>
            </div>
          </div>
        </div>

        {!unlocked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/55 backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-1 text-zinc-300">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                Complete all courses to unlock
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
