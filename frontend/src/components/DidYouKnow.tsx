"use client";

import { useEffect, useState } from "react";

const FACTS = [
  "Chiliz powers Fan Tokens for 100+ football, esports, and combat-sports organizations worldwide.",
  "Socios lets fans vote on real club decisions - kit designs, goal celebrations, and more.",
  "Fan Tokens live on Chiliz Chain, an EVM-compatible network - the same tech as Ethereum, tuned for sports.",
  "CHZ is the native gas token of Chiliz Chain, used to pay for every onchain transaction.",
  "Chiliz Chain confirms transactions in seconds, with fees a fraction of a cent.",
  "Your Chiliz Greencard is an onchain credential - proof you actually learned the ecosystem, not just clicked through it.",
];

const ROTATE_MS = 4500;

export function DidYouKnow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % FACTS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="hover-card flex min-h-[176px] flex-col justify-between rounded-2xl p-6"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">
        Did you know?
      </p>

      <p
        key={index}
        aria-live="polite"
        className="animate-pop-in mt-3 text-lg leading-7 text-foreground"
      >
        {FACTS[index]}
      </p>

      <div className="mt-5 flex gap-1.5">
        {FACTS.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i === index ? "bg-foreground" : "bg-card-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
