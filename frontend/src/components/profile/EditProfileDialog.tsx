'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { SOCIAL_PLATFORMS, type FreelancerProfile, type SocialLinks } from '@/types/domain';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, inputCls } from '@/components/form-field';
import { SOCIAL_META } from '@/components/profile/social-icons';
import { SOCIAL_HANDLE_CONFIG, buildSocialUrl, extractSocialHandle } from '@/lib/socialHandles';
import { ImageDropzone } from '@/components/profile/ImageDropzone';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Suggested headlines — free text, these only seed the `<datalist>`. */
const SPECIALIZATION_PRESETS = [
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Developer',
  'Mobile Developer',
  'UI/UX Designer',
  'Graphic Designer',
  'Motion Designer',
  'Video Editor',
  'QA Engineer',
  'DevOps Engineer',
  'SMM Manager',
  'Copywriter',
];

/** One-tap skill suggestions; anything else can be typed in. */
const SKILL_PRESETS = [
  'HTML',
  'CSS',
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Vue',
  'Tailwind CSS',
  'Node.js',
  'MongoDB',
  'Figma',
  'Photoshop',
  'Illustrator',
  'Premiere Pro',
  'After Effects',
  'Blender',
];

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

/** IANA zones for the `<datalist>`; the full list when the browser exposes it. */
function timezoneOptions(): string[] {
  const supported = (
    Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf;
  if (supported) {
    try {
      return supported('timeZone');
    } catch {
      // Fall through to the short list below.
    }
  }
  return ['Asia/Tashkent', 'Asia/Almaty', 'Europe/Moscow', 'Europe/London', 'America/New_York'];
}

type FormState = {
  username: string;
  specialization: string;
  about: string;
  avatarUrl: string;
  coverUrl: string;
  country: string;
  language: string;
  timezone: string;
};

/**
 * Owner-only editor for everything the public profile shows.
 *
 * Sends the full set of fields on every save: the API treats an empty string
 * as "clear this field", so clearing an input in the form is what removes the
 * value (and the section) from the profile.
 */
export function EditProfileDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: FreelancerProfile;
  onClose: () => void;
  /** Receives the patch to merge into the page's profile state. */
  onSaved: (changes: Partial<FreelancerProfile>) => void;
}) {
  const t = useTranslations('freelancer');
  const [form, setForm] = useState<FormState>({
    username: profile.username ?? '',
    specialization: profile.specialization ?? '',
    about: profile.about ?? '',
    avatarUrl: profile.avatarUrl ?? '',
    coverUrl: profile.coverUrl ?? '',
    country: profile.country ?? '',
    language: profile.language ?? '',
    timezone: profile.timezone ?? '',
  });
  const [skills, setSkills] = useState<string[]>(profile.skills);
  // Displayed/edited as bare handles ("@name", "username", …), converted
  // to full URLs only on submit — see `lib/socialHandles.ts`.
  const [socials, setSocials] = useState<SocialLinks>(() =>
    Object.fromEntries(
      SOCIAL_PLATFORMS.map((p) => [p, extractSocialHandle(p, profile.socials[p])]),
    ) as SocialLinks,
  );
  const [skillDraft, setSkillDraft] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const addSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    // Case-insensitive dedupe, but the typed casing is what gets stored.
    if (!skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      setSkills((prev) => [...prev, skill]);
    }
    setSkillDraft('');
  };

  const onSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillDraft);
    } else if (e.key === 'Backspace' && !skillDraft) {
      setSkills((prev) => prev.slice(0, -1));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = form.username.trim().toLowerCase();
    if (username && !USERNAME_RE.test(username)) {
      setUsernameError(t('errUsernameFormat'));
      return;
    }
    setUsernameError(null);
    setError(null);
    setSaving(true);

    try {
      const updated = await api.updateMe({
        // Usernames can't be cleared once set (the profile URL would break),
        // so an emptied field is simply not sent.
        ...(username ? { username } : {}),
        specialization: form.specialization.trim(),
        about: form.about.trim(),
        avatarUrl: form.avatarUrl.trim(),
        coverUrl: form.coverUrl.trim(),
        country: form.country.trim(),
        language: form.language.trim(),
        timezone: form.timezone.trim(),
        skills,
        // Every platform is sent, so unchecked/emptied ones clear server-side.
        socials: Object.fromEntries(
          SOCIAL_PLATFORMS.map((p) => [p, buildSocialUrl(p, socials[p] ?? '')]),
        ) as SocialLinks,
      });

      onSaved({
        username: updated.username,
        specialization: updated.specialization,
        about: updated.about,
        avatarUrl: updated.avatarUrl,
        coverUrl: updated.coverUrl,
        country: updated.country,
        language: updated.language,
        timezone: updated.timezone,
        skills: updated.skills,
        socials: updated.socials,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('saveError'));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('editProfile')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('username')} error={usernameError ?? undefined}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  @
                </span>
                <input
                  value={form.username}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, username: e.target.value }));
                    setUsernameError(null);
                  }}
                  maxLength={30}
                  aria-invalid={!!usernameError}
                  className={cn(inputCls, 'pl-7 font-mono')}
                />
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{t('usernameHint')}</p>
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {form.username.length.toLocaleString()}/30
                </p>
              </div>
            </Field>

            <Field label={t('specialization')}>
              <input
                value={form.specialization}
                onChange={set('specialization')}
                list="specialization-presets"
                placeholder="Frontend Developer"
                maxLength={80}
                className={inputCls}
              />
              <datalist id="specialization-presets">
                {SPECIALIZATION_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
                {form.specialization.length.toLocaleString()}/80
              </p>
            </Field>
          </div>

          <Field label={t('skills')}>
            <div className="flex flex-wrap gap-1.5 rounded-md border bg-background p-2">
              {skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                  aria-label={`${t('removeSkill')}: ${skill}`}
                  title={t('removeSkill')}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  {skill}
                  <X className="h-3 w-3 opacity-60" />
                </button>
              ))}
              <input
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={onSkillKeyDown}
                onBlur={() => addSkill(skillDraft)}
                placeholder={t('skillsPlaceholder')}
                className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('skillsHint')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SKILL_PRESETS.filter(
                (s) => !skills.some((existing) => existing.toLowerCase() === s.toLowerCase()),
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSkill(s)}
                  className="rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  + {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t('about')}>
            <textarea
              value={form.about}
              onChange={set('about')}
              rows={4}
              maxLength={600}
              className={cn(inputCls, 'resize-y')}
            />
            <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
              {form.about.length.toLocaleString()}/600
            </p>
          </Field>

          <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            <ImageDropzone
              label={t('avatarImage')}
              variant="avatar"
              value={form.avatarUrl}
              onChange={(v) => setForm((f) => ({ ...f, avatarUrl: v }))}
            />
            <ImageDropzone
              label={t('coverImage')}
              variant="cover"
              value={form.coverUrl}
              onChange={(v) => setForm((f) => ({ ...f, coverUrl: v }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t('country')}>
              <input value={form.country} onChange={set('country')} className={inputCls} />
            </Field>
            <Field label={t('language')}>
              <input value={form.language} onChange={set('language')} className={inputCls} />
            </Field>
            <Field label={t('timezone')}>
              <input
                value={form.timezone}
                onChange={set('timezone')}
                list="timezone-options"
                placeholder="Asia/Tashkent"
                className={inputCls}
              />
              <datalist id="timezone-options">
                {timezoneOptions().map((tz) => (
                  <option key={tz} value={tz} />
                ))}
              </datalist>
            </Field>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-dashed p-3">
            <legend className="px-1 text-sm font-medium">{t('socials')}</legend>
            <div className="grid gap-3 md:grid-cols-2">
              {SOCIAL_PLATFORMS.map((platform) => {
                const { label, Icon } = SOCIAL_META[platform];
                // telegram/instagram/github/behance/dribbble: bare handle,
                // prefixed with "@" or the platform's domain. `website`:
                // always "https://", the rest is free text. `linkedin` has
                // no fixed shape — plain URL field, same as before.
                const handleCfg = SOCIAL_HANDLE_CONFIG[platform];
                const prefix = platform === 'website' ? 'https://' : handleCfg?.prefix;
                return (
                  <label key={platform} className="block">
                    <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                    {prefix ? (
                      <div className="flex items-center rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring">
                        <span className="shrink-0 select-none py-2 pl-3 text-sm text-muted-foreground">
                          {prefix}
                        </span>
                        <input
                          value={socials[platform] ?? ''}
                          onChange={(e) =>
                            setSocials((prev) => ({ ...prev, [platform]: e.target.value }))
                          }
                          maxLength={200}
                          placeholder={platform === 'website' ? 'example.com' : 'username'}
                          className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-sm outline-none"
                        />
                      </div>
                    ) : (
                      <input
                        type="url"
                        value={socials[platform] ?? ''}
                        onChange={(e) =>
                          setSocials((prev) => ({ ...prev, [platform]: e.target.value }))
                        }
                        maxLength={200}
                        placeholder="https://…"
                        className={inputCls}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
