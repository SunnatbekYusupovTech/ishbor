import type { SocialPlatform } from '@/types/domain';

/**
 * Per-platform "just type your handle" config for the profile-edit form.
 *
 * The backend still stores (and `SocialLinksSection` still renders) a full
 * URL — `linkField` in `userSchemas.ts` requires `z.string().url()`. This is
 * purely a UI convenience layer: `buildSocialUrl` turns whatever the user
 * typed into that full URL before it's sent, `extractSocialHandle` reverses
 * it when the dialog opens so the field shows just the handle again.
 *
 * `linkedin` has no entry — it stays a plain URL field (no single canonical
 * "linkedin.com/in/<x>" shape worth assuming).
 */
export const SOCIAL_HANDLE_CONFIG: Partial<Record<SocialPlatform, { prefix: string; domain: string }>> = {
  telegram: { prefix: '@', domain: 't.me' },
  instagram: { prefix: '@', domain: 'instagram.com' },
  github: { prefix: 'github.com/', domain: 'github.com' },
  behance: { prefix: 'behance.net/', domain: 'behance.net' },
  dribbble: { prefix: 'dribbble.com/', domain: 'dribbble.com' },
};

/** Strips a protocol, optional `www.`, and (if present) the platform's own
 *  domain from something the user pasted, so pasting a full profile URL
 *  works just as well as typing the bare handle. */
function stripToHandle(raw: string, domain: string): string {
  let v = raw.trim();
  v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  if (v.toLowerCase().startsWith(`${domain.toLowerCase()}/`)) v = v.slice(domain.length + 1);
  else if (v.toLowerCase() === domain.toLowerCase()) v = '';
  return v.replace(/^@/, '').replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Form value (handle, or bare domain for `website`) → stored URL, or `''`
 *  to clear the field (the empty-string-clears contract `linkField` expects). */
export function buildSocialUrl(platform: SocialPlatform, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (platform === 'website') {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  const cfg = SOCIAL_HANDLE_CONFIG[platform];
  if (!cfg) return trimmed; // linkedin — sent through as-is.
  const handle = stripToHandle(trimmed, cfg.domain);
  return handle ? `https://${cfg.domain}/${handle}` : '';
}

/** Stored URL → form value shown in the input. Falls back to the raw stored
 *  value for links that don't match the expected shape (e.g. a legacy URL
 *  saved before this convention existed) rather than mangling it. */
export function extractSocialHandle(platform: SocialPlatform, storedUrl: string | null | undefined): string {
  const value = storedUrl ?? '';
  if (!value) return '';
  if (platform === 'website') return value.replace(/^https?:\/\//i, '');
  const cfg = SOCIAL_HANDLE_CONFIG[platform];
  if (!cfg) return value; // linkedin
  const prefixes = [`https://${cfg.domain}/`, `http://${cfg.domain}/`, `https://www.${cfg.domain}/`];
  const matched = prefixes.find((p) => value.toLowerCase().startsWith(p.toLowerCase()));
  return matched ? value.slice(matched.length) : value;
}
