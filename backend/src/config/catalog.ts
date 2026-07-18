/**
 * The assessment taxonomy: each DIRECTION offers a set of TECHNOLOGIES.
 * A candidate picks a direction, selects the technologies they know, and the
 * engine serves the hardest questions (QUESTIONS_PER_TECH each) from those pools.
 *
 * `fullstack` is the de-duplicated union of frontend + backend.
 */

export type Direction = 'frontend' | 'backend' | 'fullstack' | 'mobile';

export const DIRECTIONS: Direction[] = ['frontend', 'backend', 'fullstack', 'mobile'];

/** Number of (hardest) questions served per selected technology. */
export const QUESTIONS_PER_TECH = 5;

const FRONTEND_TECHS = [
  'html',
  'css',
  'bootstrap',
  'tailwind',
  'javascript',
  'typescript',
  'react',
  'vue',
  'nextjs',
  'git',
] as const;

const BACKEND_TECHS = [
  'nodejs',
  'express',
  'mongodb',
  'sql',
  'typescript',
  'rest',
  'git',
] as const;

const MOBILE_TECHS = ['swift', 'kotlin', 'react-native', 'flutter', 'git'] as const;

/** Union of frontend + backend, order-preserving and de-duplicated. */
const FULLSTACK_TECHS = Array.from(
  new Set<string>([...FRONTEND_TECHS, ...BACKEND_TECHS]),
);

export const DIRECTION_TECHNOLOGIES: Record<Direction, string[]> = {
  frontend: [...FRONTEND_TECHS],
  backend: [...BACKEND_TECHS],
  fullstack: FULLSTACK_TECHS,
  mobile: [...MOBILE_TECHS],
};

/** Every technology id that can carry questions (used to validate the schema). */
export const ALL_TECHNOLOGIES: string[] = Array.from(
  new Set<string>(Object.values(DIRECTION_TECHNOLOGIES).flat()),
);

/** True if `tech` is a valid technology for the given direction. */
export function isTechnologyInDirection(direction: Direction, tech: string): boolean {
  return DIRECTION_TECHNOLOGIES[direction]?.includes(tech) ?? false;
}
