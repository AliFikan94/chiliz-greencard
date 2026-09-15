const STREAK_KEY = "greencard_streak";
const LAST_VISIT_KEY = "greencard_streak_last_visit";

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Bumps and returns the current daily streak. Visiting again on the same
 * day is a no-op; visiting the day right after the last visit extends the
 * streak; any bigger gap resets it to 1. Purely a client-side vanity
 * counter (localStorage), not tied to backend progress.
 */
export function touchDailyStreak(): number {
  try {
    const today = toDateString(new Date());
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);

    if (lastVisit === today) {
      return Number(localStorage.getItem(STREAK_KEY) || "1");
    }

    const yesterday = toDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const previousStreak = Number(localStorage.getItem(STREAK_KEY) || "0");
    const nextStreak = lastVisit === yesterday ? previousStreak + 1 : 1;

    localStorage.setItem(STREAK_KEY, String(nextStreak));
    localStorage.setItem(LAST_VISIT_KEY, today);
    return nextStreak;
  } catch {
    return 1;
  }
}
