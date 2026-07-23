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

export interface Me {
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
