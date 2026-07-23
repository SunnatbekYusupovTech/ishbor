import type {
  StartTestResponse,
  SubmitTestResponse,
  TabSwitchResponse,
  ViolationResponse,
  ViolationType,
} from '@/types/test';
import type { Job, CreateJobInput, LeaderboardEntry, Me, Catalog } from '@/types/domain';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

const TOKEN_KEY = 'ishbor_token';
const REFRESH_TOKEN_KEY = 'ishbor_refresh_token';

export const tokenStore = {
  get: (): string | null =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY),
  set: (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  getRefresh: (): string | null =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_TOKEN_KEY),
  setRefresh: (refreshToken: string) => window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
  clear: () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
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

/** Paths that must never trigger a refresh-and-retry (avoids infinite loops / nonsense). */
const NO_REFRESH_PATHS = new Set(['/auth/login', '/auth/register', '/auth/refresh']);

// Concurrent 401s should trigger exactly one refresh call, not one per request.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || payload?.success === false) return false;
        tokenStore.set(payload.data.token);
        tokenStore.setRefresh(payload.data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
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
    // An expired access token: silently refresh and retry the SAME request
    // once. If refresh also fails, the caller sees the original 401 and the
    // UI treats it as "session expired" (both tokens are cleared).
    if (res.status === 401 && !_isRetry && !NO_REFRESH_PATHS.has(path)) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return request<T>(path, options, true);
      tokenStore.clear();
    }
    const message = payload?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, payload?.error?.details);
  }

  return payload.data as T;
}

/**
 * Low-level authenticated request helper. Same base URL + 401 refresh-and-retry
 * as every `api.*` method. Exposed for feature areas (e.g. the admin panel) that
 * need ad-hoc endpoints not worth a dedicated `api.*` wrapper — always use this
 * instead of a bare `fetch('/api/...')`, which would hit the frontend origin and
 * skip token refresh.
 */
export function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, options);
}

export const api = {
  // --- Auth (dev-friendly helpers) ---
  register: (body: { name?: string; email: string; password: string; role?: string }) =>
    request<{
      token: string;
      refreshToken: string;
      user: { id: string; email: string; role: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{
      token: string;
      refreshToken: string;
      user: { id: string; email: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Logs out this device only — revokes just the locally-held refresh token. */
  logout: async (): Promise<void> => {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) {
      await request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {
        // Best-effort: even if the server call fails (offline, token already
        // gone), we still want to drop the local tokens below.
      });
    }
    tokenStore.clear();
  },

  /**
   * Signs out of EVERY device: revokes every refresh token this account
   * holds. Any access token still valid elsewhere keeps working until its
   * own short expiry (`accessTokenTtl`, 15m) — see the server-side comment
   * on `logoutAll` for why that's an accepted trade-off, not a bug.
   */
  logoutAllDevices: async (): Promise<void> => {
    await request('/auth/logout-all', { method: 'POST' }).catch(() => {
      // Best-effort, same reasoning as `logout`.
    });
    tokenStore.clear();
  },

  // --- Assessment ---
  getCatalog: () => request<Catalog>('/test/catalog'),

  startTest: (body: { direction: string; technologies: string[]; locale?: string }) =>
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

  /** QA-tester-only shortcut — instantly finishes a session with a perfect
   *  score. 403s for any non-QA account (see `Me.isQaTester`). */
  autoCompleteTest: (sessionId: string) =>
    request<SubmitTestResponse>('/test/auto-complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  recordTabSwitch: (sessionId: string) =>
    request<TabSwitchResponse>('/test/tab-switch', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  recordViolation: (sessionId: string, type: ViolationType) =>
    request<ViolationResponse>('/test/violation', {
      method: 'POST',
      body: JSON.stringify({ sessionId, type }),
    }),

  // --- Current user ---
  me: () => request<Me>('/auth/me'),

  /** Every field optional — send only what's changing. Setting `newPassword`
   *  requires `currentPassword` (server-enforced, see `userSchemas.ts`). */
  updateMe: (body: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) =>
    request<Me>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  /** Password-confirmed self-deletion — cascades server-side (listings,
   *  sessions, refresh tokens). Caller must clear local tokens afterwards. */
  deleteMe: (password: string) =>
    request<{ deleted: boolean }>('/auth/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  // --- Jobs ---
  getJobs: (filters: {
    type?: string;
    level?: string;
    stack?: string;
    keyword?: string;
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    sort?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (filters.type) qs.set('type', filters.type);
    if (filters.level) qs.set('level', filters.level);
    if (filters.stack) qs.set('stack', filters.stack);
    if (filters.keyword) qs.set('keyword', filters.keyword);
    if (filters.location) qs.set('location', filters.location);
    if (filters.salaryMin !== undefined) qs.set('salaryMin', String(filters.salaryMin));
    if (filters.salaryMax !== undefined) qs.set('salaryMax', String(filters.salaryMax));
    if (filters.sort) qs.set('sort', filters.sort);
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
