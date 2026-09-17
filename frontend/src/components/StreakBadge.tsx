"use client";

import { useEffect, useState } from "react";

import { touchDailyStreak } from "@/lib/streak";

export function StreakBadge() {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStreak(touchDailyStreak());
  }, []);

  if (!streak) return null;

  return (
    <div className="flex items-center gap-1 rounded-full border border-card-border bg-card px-3 py-2 text-sm font-medium text-foreground">
      <span aria-hidden="true">🔥</span>
      <span>{streak}-day streak</span>
    </div>
  );
}
