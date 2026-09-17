import { AnswerResult, CourseSummary, StartRunResult } from "./types";

export const LEARNING_API =
  process.env.NEXT_PUBLIC_LEARNING_API_BASE || "http://127.0.0.1:8000/api/learning";

export type LeaderboardEntry = {
  rank: number;
  wallet_address: string;
  xp: number;
  courses_passed: number;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
};

async function postJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${LEARNING_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Request to ${path} failed (${response.status})`);
  }

  return response.json();
}

export async function fetchCourses(sessionKey: string | null): Promise<CourseSummary[]> {
  const query = sessionKey ? `?session_key=${encodeURIComponent(sessionKey)}` : "";
  const response = await fetch(`${LEARNING_API}/${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load courses");
  return response.json();
}

export function startCourse(slug: string, sessionKey: string): Promise<StartRunResult> {
  return postJson<StartRunResult>(`/${slug}/start/`, { session_key: sessionKey });
}

export function submitAnswer(
  experienceId: number,
  choiceId: number,
  sessionKey: string
): Promise<AnswerResult> {
  return postJson<AnswerResult>(`/experience/${experienceId}/answer/`, {
    choice_id: choiceId,
    session_key: sessionKey,
  });
}

export async function fetchLeaderboard(sessionKey: string | null): Promise<LeaderboardResponse> {
  const query = sessionKey ? `?session_key=${encodeURIComponent(sessionKey)}` : "";
  const response = await fetch(`${LEARNING_API}/leaderboard/${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load leaderboard");
  return response.json();
}
