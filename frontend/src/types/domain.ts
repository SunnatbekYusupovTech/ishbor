export type Level = 'junior' | 'middle' | 'senior';
export type Stack = 'frontend' | 'backend' | 'fullstack' | 'mobile';
export type Direction = 'frontend' | 'backend' | 'fullstack' | 'mobile';
/**
 * Six non-"none" tiers — odd counts of passed technologies (1/3/5) land on
 * the named tier, even counts (2/4/6+) land on that tier's "strong" variant.
 * Mirrors `backend/src/models/User.ts`'s `Tier` + `TIERS`.
 */
export type VerificationLevel =
  | 'none'
  | 'junior'
  | 'strong-junior'
  | 'middle'
  | 'strong-middle'
  | 'senior'
  | 'strong-senior';
export const TIERS: VerificationLevel[] = [
  'none',
  'junior',
  'strong-junior',
  'middle',
  'strong-middle',
  'senior',
  'strong-senior',
];
export type Role = 'employer' | 'seeker' | 'admin';
export type ListingType = 'vacancy' | 'resume';

export interface Catalog {
  /** direction → ordered list of technology ids */
  directions: Record<Direction, string[]>;
  questionsPerTech: number;
  /** technology id → number of available questions */
  perTech: Record<string, number>;
}

export interface JobRating {
  verificationLevel: VerificationLevel;
  bestPercentage: number;
  bestScore: number;
  attempts: number;
  memberSince: string;
}

export interface Job {
  id: string;
  type: ListingType;
  title: string;
  company: string | null;
  description: string;
  level: Level;
  stack: Stack;
  salary: string | null;
  location: string | null;
  contactPhone: string | null;
  contactTelegram: string | null;
  postedByName: string;
  postedByRole: Role;
  createdAt: string;
  /** Author reputation — null for legacy listings without a linked user. */
  rating: JobRating | null;
}

export interface CreateJobInput {
  title: string;
  company?: string;
  description: string;
  level?: Level;
  stack: Stack;
  salary?: string;
  location?: string;
  contactPhone?: string;
  contactTelegram?: string;
}

export type SortOption = 'newest' | 'oldest' | 'salary_asc' | 'salary_desc';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  /** The entry's `primaryDirection` tier if set, else their highest tier across any direction. */
  verificationLevel: VerificationLevel;
  primaryDirection: Direction | null;
  bestPercentage: number;
  bestScore: number;
}

export interface Me extends FreelancerProfileFields {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** One tier per direction — see `VerificationLevel` doc comment. */
  verificationLevels: Record<Direction, VerificationLevel>;
  /** The candidate's own "who am I" pick, editable via `api.updateMe`. */
  primaryDirection: Direction | null;
  bestPercentage: number;
  bestScore: number;
  attempts: number;
  /** QA/anti-cheat testing account — unlocks the "auto-finish" test shortcut. */
  isQaTester?: boolean;
}

/* ------------------------- Public freelancer profile ------------------------ */

/** Mirrors `SOCIAL_PLATFORMS` in `backend/src/models/User.ts`. */
export const SOCIAL_PLATFORMS = [
  'telegram',
  'instagram',
  'linkedin',
  'github',
  'behance',
  'dribbble',
  'website',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
/** Only the links the user actually filled in are present. */
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

/** The editable half of a freelancer profile — shared by `Me` and the edit form. */
export interface FreelancerProfileFields {
  /** The `@handle` in `/u/<username>`; `null` for accounts that never set one. */
  username: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  /** Headline: "Frontend Developer", "Motion Designer", … */
  specialization: string | null;
  skills: string[];
  about: string | null;
  socials: SocialLinks;
  country: string | null;
  language: string | null;
  /** IANA zone (`Asia/Tashkent`) — the sidebar's local clock is derived from it. */
  timezone: string | null;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
  createdAt: string;
}

export interface ProfileReview {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  /** 1–5 stars. */
  rating: number;
  text: string;
  createdAt: string;
  /** True when the signed-in viewer wrote this review (they may edit/delete it). */
  isMine: boolean;
}

/** Everything `/u/<handle>` renders, in one response. */
export interface FreelancerProfile extends FreelancerProfileFields {
  id: string;
  name: string;
  role: Role;
  memberSince: string;
  isOnline: boolean;
  verificationLevels: Record<Direction, VerificationLevel>;
  primaryDirection: Direction | null;
  bestPercentage: number;
  attempts: number;
  /** Drives every add/edit/delete control on the page. */
  isOwner: boolean;
  portfolio: PortfolioItem[];
  reviews: ProfileReview[];
  reviewCount: number;
  /** Mean star rating across `reviews`, one decimal; `0` when there are none. */
  reviewAverage: number;
}

export interface PortfolioItemInput {
  title: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  link?: string;
}

/* ------------------------- Job detail (dialog) ------------------------- */

/** `GET /jobs/:id` — the list shape plus the request/chat action flags. */
export interface JobDetail extends Job {
  /** Whose listing this is — lets the viewer tell "my vacancy" apart. */
  postedById: string | null;
  /** True when the signed-in seeker already sent a request for this vacancy. */
  appliedByMe: boolean;
  /** The viewer's own request status, when they applied. */
  myApplicationStatus: ApplicationStatus | null;
  /** The auto-created thread for my request — jump straight to it. */
  myApplicationConversationId: string | null;
  /** Requests received — only populated for the vacancy's own employer. */
  applicationCount: number;
}

/* ------------------------- Live chat ------------------------- */

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface ChatParticipantSnippet {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  specialization: string | null;
  role: Role;
  isOnline: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  /** Participant ids who have seen this message (sender always included). */
  readBy: string[];
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  jobId: string | null;
  applicationId: string | null;
  /** The linked request's live status (accept/reject shows in the chat banner). */
  application: { id: string; status: ApplicationStatus } | null;
  /** The listing this thread was opened from (title for the header banner). */
  job: { id: string; title: string; type: ListingType } | null;
  lastMessageAt: string;
  other: ChatParticipantSnippet;
  lastMessage: { id: string; text: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  meId: string;
}

export interface MessagesPage {
  messages: ChatMessage[];
  hasMore: boolean;
}

/* --------------------- Job application (request) --------------------- */

/** The FULL seeker profile form attached to every request for the employer. */
export interface SeekerCard {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  specialization: string | null;
  skills: string[];
  about: string | null;
  socials: SocialLinks;
  country: string | null;
  language: string | null;
  timezone: string | null;
  memberSince: string;
  isOnline: boolean;
  verificationLevels: Record<Direction, VerificationLevel>;
  primaryDirection: Direction | null;
  bestPercentage: number;
  bestScore: number;
  attempts: number;
  portfolio: PortfolioItem[];
  reviewCount: number;
  reviewAverage: number;
  /** The `/u/<handle>` slug (username, or the id when there's no username). */
  handle: string;
}

export interface Application {
  id: string;
  jobId: string;
  seekerId: string;
  employerId: string;
  message: string | null;
  status: ApplicationStatus;
  conversationId: string;
  seenByEmployer: boolean;
  createdAt: string;
}

/** One request as the vacancy's employer sees it — application + full form. */
export interface JobApplication extends Application {
  seeker: SeekerCard | null;
}

export interface JobApplicationsResponse {
  job: { id: string; title: string; level: Level; stack: Stack; salary: string | null; location: string | null };
  applications: JobApplication[];
}

/** One request as the seeker sees it (their own applications). */
export interface MyApplication extends Application {
  job: {
    id: string;
    title: string;
    company: string | null;
    stack: Stack;
    level: Level;
    salary: string | null;
    location: string | null;
  } | null;
  employer: {
    id: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
    specialization: string | null;
  } | null;
}
