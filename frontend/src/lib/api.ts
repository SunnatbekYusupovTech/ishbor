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
  JobDetail,
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
  ChatConversation,
  ChatMessage,
  MessagesPage,
  Application,
  JobApplication,
  JobApplicationsResponse,
  MyApplication,
  ApplicationStatus,
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
const AUTHED_MARKER = 'ishzone_authed';

/**
 * Fired synchronously whenever `markAuthed`/`clear` run, so `useCurrentUser`
 * can refetch/clear immediately instead of waiting for a `pathname` change.
 * That wait was the actual bug behind "logout/login needs 2-3 tries": e.g.
 * confirming logout while already on `/` calls `router.push('/')`, which is
 * a no-op for Next's `usePathname` (same string in, same string out) — the
 * pathname-keyed effect never re-ran, so the header kept showing the old
 * session until an unrelated navigation happened to change the pathname.
 */
const AUTH_CHANGED_EVENT = 'ishzone:authed-changed';

export const tokenStore = {
  /** Synchronous, best-effort "looks logged in" hint — see `AUTHED_MARKER` above. */
  get: (): boolean => Cookies.get(AUTHED_MARKER) === '1',
  markAuthed: () => {
    Cookies.set(AUTHED_MARKER, '1', { expires: 30, sameSite: 'lax' });
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  },
  clear: () => {
    Cookies.remove(AUTHED_MARKER);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  },
};

export { AUTH_CHANGED_EVENT };

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
const NO_REFRESH_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/google',
]);

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
  /**
   * Two possible shapes: `{ user }` (mailer not configured on this deployment —
   * account is created and logged in immediately, same as before this
   * feature existed) or `{ requiresVerification: true, email }` (the normal
   * path — no cookies set yet, caller must show a code-entry step and call
   * `api.verifyEmail` to actually log in).
   */
  register: (body: { name?: string; email: string; password: string; role?: string }) =>
    request<
      | { user: { id: string; email: string; role: string } }
      | { requiresVerification: true; email: string }
    >('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((data) => {
      if ('user' in data) tokenStore.markAuthed();
      return data;
    }),

  /** Completes registration: verifies the emailed code and logs the account in. */
  verifyEmail: (body: { email: string; code: string }) =>
    request<{
      user: { id: string; email: string; role: string };
    }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((data) => {
      tokenStore.markAuthed();
      return data;
    }),

  /** Always resolves (never reveals whether the email needs verification). */
  resendVerification: (email: string) =>
    request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
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

  /** Throws (404) if no account is registered under that email — see backend. */
  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /** Checks the code alone, without changing the password — a UX step so the
   *  frontend can ask for the code and the new password on separate screens.
   *  Not itself a trust boundary: `resetPassword` re-validates from scratch. */
  verifyResetCode: (body: { email: string; code: string }) =>
    request<{ valid: boolean }>('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Verifies the emailed code and sets `newPassword`; also revokes every session on the account. */
  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    request<{ reset: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

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
    /** Which side of the market — `seeker`/`employer` only, `admin` is never self-assignable. */
    role?: 'seeker' | 'employer';
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
        window.dispatchEvent(new CustomEvent<Me>('ishzone:me-updated', { detail: me }));
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

  /** Full listing detail + request/chat flags (`appliedByMe`, `applicationCount`, ...). */
  getJob: (id: string) => request<JobDetail>(`/jobs/${encodeURIComponent(id)}`),

  // --- Live chat (employer ↔ seeker) ---

  listConversations: () => request<ChatConversation[]>('/chat/conversations'),

  getMessages: (conversationId: string, before?: string) => {
    const qs = before ? `?before=${encodeURIComponent(before)}` : '';
    return request<MessagesPage>(`/chat/conversations/${conversationId}/messages${qs}`);
  },

  sendMessage: (conversationId: string, text: string) =>
    request<ChatMessage>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  markConversationRead: (conversationId: string) =>
    request<{ read: boolean }>(`/chat/conversations/${conversationId}/read`, {
      method: 'POST',
    }),

  /** Opens (or finds) the thread with another user — idempotent per pair. */
  startConversation: (userId: string, jobId?: string) =>
    request<{ id: string }>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ userId, ...(jobId ? { jobId } : {}) }),
    }),

  // --- Job applications (requests) ---

  /** Seeker → employer: the request. Auto-creates the chat thread. */
  applyToJob: (jobId: string, message?: string) =>
    request<{ application: Application; conversationId: string }>(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify(message ? { message } : {}),
    }),

  /** File a complaint about a vacancy (More menu → Report). */
  reportJob: (jobId: string, reason: string, note?: string) =>
    request<{ id: string }>(`/jobs/${jobId}/report`, {
      method: 'POST',
      body: JSON.stringify(note ? { reason, note } : { reason }),
    }),

  /** The vacancy's employer reviews every request with the seeker's FULL form. */
  listJobApplications: (jobId: string) =>
    request<JobApplicationsResponse>(`/jobs/${jobId}/applications`),

  /** The requests I (a seeker) sent. */
  listMyApplications: () => request<MyApplication[]>('/applications/mine'),

  /** Employer decision on one request — updates the seeker live via socket. */
  updateApplication: (applicationId: string, status: ApplicationStatus) =>
    request<{ id: string; status: ApplicationStatus }>(`/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // --- Leaderboard ---

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
