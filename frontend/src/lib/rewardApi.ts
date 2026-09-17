const REWARD_API =
  process.env.NEXT_PUBLIC_REWARD_API_BASE || "http://127.0.0.1:8000/api/reward";

export type RewardVoucherResponse = {
  reward_type: number;
  wallet_address: string;
  token_address: string;
  amount: string;
  uri: string;
  nonce: string;
  expiry: number;
  signature: string;
  contractAddress: string;
  chainId: number;
};

async function postJson<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${REWARD_API}${path}`, {
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

export function bindWallet(sessionKey: string, walletAddress: string) {
  return postJson<{ wallet_address: string }>("/wallet/", {
    session_key: sessionKey,
    wallet_address: walletAddress,
  });
}

export function requestExperienceVoucher(sessionKey: string, experienceId: number) {
  return postJson<RewardVoucherResponse>(`/experience/${experienceId}/voucher/`, {
    session_key: sessionKey,
  });
}

export type GreencardStatus = {
  xp: number;
  wallet_address: string | null;
  courses_passed: number;
  total_courses: number;
  eligible: boolean;
  voucher: RewardVoucherResponse | null;
};

export async function fetchGreencardStatus(sessionKey: string): Promise<GreencardStatus> {
  const response = await fetch(`${REWARD_API}/greencard/status/${sessionKey}/`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Failed to load Greencard status");
  return response.json();
}

export function requestGreencardVoucher(sessionKey: string) {
  return postJson<RewardVoucherResponse>("/greencard/voucher/", {
    session_key: sessionKey,
  });
}
