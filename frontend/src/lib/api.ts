import type {
  StartTestResponse,
  SubmitTestResponse,
  TabSwitchResponse,
} from '@/types/test';
import type { Job, CreateJobInput, LeaderboardEntry, Me, Catalog } from '@/types/domain';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

const TOKEN_KEY = 'ishbor_token';

export const tokenStore = {
  get: (): string | null =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY),
  set: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();

  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok || payload?.success === false) {
    const message = payload?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, payload?.error?.details);
  }

  return payload.data as T;
}

export const api = {
  // --- Auth (dev-friendly helpers) ---
  register: (body: { name?: string; email: string; password: string; role?: string }) =>
    request<{ token: string; user: { id: string; email: string; role: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // --- Assessment ---
  getCatalog: () => request<Catalog>('/test/catalog'),

  startTest: (body: { direction: string; technologies: string[] }) =>
    request<StartTestResponse>('/test/start', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  submitTest: (body: {
    sessionId: string;
    answers: Array<{ questionId: string; userAnswer: number }>;
  }) =>
    request<SubmitTestResponse>('/test/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  recordTabSwitch: (sessionId: string) =>
    request<TabSwitchResponse>('/test/tab-switch', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  // --- Current user ---
  me: () => request<Me>('/auth/me'),

  // --- Jobs ---
  getJobs: (filters: { type?: string; level?: string; stack?: string } = {}) => {
    const qs = new URLSearchParams();
    if (filters.type) qs.set('type', filters.type);
    if (filters.level) qs.set('level', filters.level);
    if (filters.stack) qs.set('stack', filters.stack);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Job[]>(`/jobs${suffix}`);
  },

  createJob: (body: CreateJobInput) =>
    request<{ id: string }>('/jobs', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // --- Leaderboard ---
  getLeaderboard: () => request<LeaderboardEntry[]>('/users/leaderboard'),
};

export { ApiError };
