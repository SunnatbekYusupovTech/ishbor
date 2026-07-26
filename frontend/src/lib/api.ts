import Cookies from 'js-cookie';
import type {
  StartTestResponse,
  SubmitTestResponse,
  TabSwitchResponse,
  ViolationResponse,
  ViolationType,
} from '@/types/test';
import type {
  Job,
  CreateJobInput,
  LeaderboardEntry,
  Me,
  Catalog,
  Direction,
  FreelancerProfile,
  PortfolioItem,
  PortfolioItemInput,
  ProfileReview,
  SocialLinks,
} from '@/types/domain';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/**
 * The real access/refresh tokens live in httpOnly cookies set by the backend
 * (`Set-Cookie`, `HttpOnly` + `Secure` in prod + `SameSite`) — client JS never
 * reads or writes them, and every `fetch` below sends `credentials: 'include'`
 * so the browser attaches them automatically. `AUTHED_MARKER` is a separate,
 * **non**-httpOnly cookie (readable via `js-cookie`) that only records "was
 * the last auth call successful" — a cheap synchronous hint for pages that
 * want to redirect before the async `api.me()` round-trip resolves. It is
 * never sent to the server and carries no security weight; the real gate on
 * every request is still the httpOnly cookie the browser sends on its own.
 */
const AUTHED_MARKER = 'ishbor_authed';

export const tokenStore = {
  /** Synchronous, best-effort "looks logged in" hint — see `AUTHED_MARKER` above. */
  get: (): boolean => Cookies.get(AUTHED_MARKER) === '1',
  markAuthed: () => Cookies.set(AUTHED_MARKER, '1', { expires: 30, sameSite: 'lax' }),
  clear: () => Cookies.remove(AUTHED_MARKER),
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
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        // No body needed — the refresh token travels as an httpOnly cookie
        // scoped to `/api/auth`; `credentials: 'include'` is what makes the
        // browser attach it cross-origin.
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || payload?.success === false) return false;
        tokenStore.markAuthed();
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
  // A multipart upload must NOT carry an explicit Content-Type — the browser
  // has to set it itself so it can append the boundary parameter. Everything
  // else on this API is JSON.
  const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...options,
      // Sends the httpOnly access/refresh cookies with every request (and
      // lets the browser store the ones the server sets via `Set-Cookie`) —
      // required since the frontend (3000) and backend (5000) are different
      // origins. The server's CORS `credentials: true` + explicit origin
      // allow-list (never `*`) is what makes this legal cross-origin.
      credentials: 'include',
      headers: {
        ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    });
  } catch {
    // `fetch` only rejects when the request never produced a response at all:
    // the API is down, DNS/connection failed, or — the common one in dev —
    // the browser blocked it because this origin isn't in the server's
    // CLIENT_ORIGIN allow-list. Surfacing that as `status: 0` lets callers
    // tell "couldn't reach the server" apart from "the server said no",
    // which otherwise look identical and are debugged very differently.
    throw new ApiError(0, `Could not reach the API at ${API_URL}.`);
  }

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
  // Tokens never appear in these response bodies — the server sets them as
  // httpOnly `Set-Cookie` headers directly (see `lib/api.ts` module docblock).
  register: (body: { name?: string; email: string; password: string; role?: string }) =>
    request<{
      user: { id: string; email: string; role: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((data) => {
      tokenStore.markAuthed();
      return data;
    }),

  login: (body: { email: string; password: string }) =>
    request<{
      user: { id: string; email: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((data) => {
      tokenStore.markAuthed();
      return data;
    }),

  /** Logs out this device only — revokes just the locally-held refresh token. */
  logout: async (): Promise<void> => {
    await request('/auth/logout', { method: 'POST' }).catch(() => {
      // Best-effort: even if the server call fails (offline, cookie already
      // gone), we still want to drop the local auth marker below.
    });
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
   *  requires `currentPassword` (server-enforced, see `userSchemas.ts`).
   *  For the freelancer-profile fields an empty string CLEARS the value
   *  (the profile then stops rendering it); omitting the key leaves it alone. */
  updateMe: (body: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    primaryDirection?: Direction | null;
    // --- Public freelancer profile ---
    username?: string;
    avatarUrl?: string;
    coverUrl?: string;
    specialization?: string;
    /** Replaces the whole tag list. */
    skills?: string[];
    about?: string;
    socials?: SocialLinks;
    country?: string;
    language?: string;
    timezone?: string;
  }) =>
    request<Me>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).then((me) => {
      // The dashboard chrome's avatar/name (`hooks/useCurrentUser.ts`) live
      // outside whatever page just called `updateMe` (profile page, edit
      // dialogs) — without this it only refreshes on the next route change,
      // so a new avatar wouldn't show up in the header until the user
      // navigated somewhere.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<Me>('ishbor:me-updated', { detail: me }));
      }
      return me;
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

  // --- Public freelancer profile (`/u/<handle>`) ---

  /** `handle` is the `@username` or, for accounts without one, the user id.
   *  Public: works signed-out too — the token only decides `isOwner`/`isMine`. */
  getProfile: (handle: string) =>
    request<FreelancerProfile>(`/users/profile/${encodeURIComponent(handle)}`),

  addPortfolioItem: (body: PortfolioItemInput) =>
    request<PortfolioItem>('/users/me/portfolio', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Partial edit — an empty string clears the field. Owner-scoped server-side. */
  updatePortfolioItem: (id: string, body: Partial<PortfolioItemInput>) =>
    request<PortfolioItem>(`/users/me/portfolio/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deletePortfolioItem: (id: string) =>
    request<{ deleted: boolean }>(`/users/me/portfolio/${id}`, { method: 'DELETE' }),

  /** One review per author per profile — posting again replaces your previous one. */
  addReview: (handle: string, body: { rating: number; text: string }) =>
    request<ProfileReview>(`/users/profile/${encodeURIComponent(handle)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteReview: (id: string) =>
    request<{ deleted: boolean }>(`/users/me/reviews/${id}`, { method: 'DELETE' }),

  /**
   * Uploads one image to Cloudinary and returns its full URL to save into
   * `avatarUrl` / `coverUrl` / a portfolio item's `imageUrl`.
   *
   * Upload and save are separate steps on purpose: the UI can show a preview
   * from the returned URL before the surrounding form is committed, and the
   * profile/portfolio endpoints stay plain JSON.
   */
  uploadImage: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<{ url: string; bytes: number; mime: string }>('/uploads/image', {
      method: 'POST',
      body,
    });
  },
};

export { ApiError };
