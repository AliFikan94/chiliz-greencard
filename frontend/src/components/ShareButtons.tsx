"use client";

import { shareLinks } from "@/lib/share";

export function ShareButtons({ text }: { text: string }) {
  const url = typeof window !== "undefined" ? window.location.origin : "https://chiliz-greencard.app";
  const links = shareLinks(text, url);

  const buttonClass =
    "rounded-full border border-card-border px-4 py-2 text-xs font-semibold text-foreground " +
    "transition hover:bg-foreground hover:text-background";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-[0.2em] text-muted">Share</span>
      <a href={links.twitter} target="_blank" rel="noreferrer" className={buttonClass}>
        X / Twitter
      </a>
      <a href={links.warpcast} target="_blank" rel="noreferrer" className={buttonClass}>
        Warpcast
      </a>
      <a href={links.telegram} target="_blank" rel="noreferrer" className={buttonClass}>
        Telegram
      </a>
    </div>
  );
}
