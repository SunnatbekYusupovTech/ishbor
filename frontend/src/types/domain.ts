export type Level = 'junior' | 'middle' | 'senior';
export type Stack = 'frontend' | 'backend' | 'fullstack' | 'mobile';
export type Direction = 'frontend' | 'backend' | 'fullstack' | 'mobile';
export type VerificationLevel = 'none' | 'junior' | 'middle' | 'senior';
export type Role = 'employer' | 'seeker';
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
  contactPhone?: string;
  contactTelegram?: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  verificationLevel: VerificationLevel;
  bestPercentage: number;
  bestScore: number;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  role: Role;
  verificationLevel: VerificationLevel;
  bestPercentage: number;
  bestScore: number;
  attempts: number;
}
