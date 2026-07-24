'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, FolderOpen, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PortfolioItem, PortfolioItemInput } from '@/types/domain';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, inputCls } from '@/components/form-field';
import { ImageDropzone } from '@/components/profile/ImageDropzone';
import { resolveImageUrl } from '@/lib/images';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * The freelancer's works. Unbounded by design (the brief asks for unlimited
 * items) — the grid just reflows, and the API stores each item as its own
 * document rather than an array on `User`.
 *
 * Add/edit/delete controls render only when `isOwner`; the server enforces
 * the same thing by scoping every mutation to the authenticated user's id,
 * so hiding the buttons is presentation, not the security boundary.
 */
export function PortfolioSection({
  items,
  isOwner,
  onChange,
}: {
  items: PortfolioItem[];
  isOwner: boolean;
  /** Receives the full next list — the page owns the profile state. */
  onChange: (items: PortfolioItem[]) => void;
}) {
  const t = useTranslations('freelancer');
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PortfolioItem | null>(null);

  const handleSaved = (item: PortfolioItem, wasNew: boolean) => {
    onChange(wasNew ? [item, ...items] : items.map((i) => (i.id === item.id ? item : i)));
    setCreating(false);
    setEditing(null);
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-base font-semibold">
            <FolderOpen className="h-4 w-4" />
            {t('portfolio')}
            {items.length > 0 && (
              <span className="text-sm font-normal tabular-nums text-muted-foreground">
                ({items.length})
              </span>
            )}
          </h2>
          {isOwner && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t('addWork')}
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            {isOwner ? t('portfolioEmptyOwner') : t('portfolioEmpty')}
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <PortfolioCard
                key={item.id}
                item={item}
                isOwner={isOwner}
                onEdit={() => setEditing(item)}
                onDelete={() => setDeleting(item)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      {(creating || editing) && (
        <PortfolioFormDialog
          item={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <DeleteWorkDialog
          item={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            onChange(items.filter((i) => i.id !== id));
            setDeleting(null);
          }}
        />
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function PortfolioCard({
  item,
  isOwner,
  onEdit,
  onDelete,
}: {
  item: PortfolioItem;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('freelancer');
  const [imageFailed, setImageFailed] = useState(false);
  // Internal uploads are stored origin-less (`/uploads/…`) — reattach the API base.
  const imageSrc = resolveImageUrl(item.imageUrl);
  const showImage = !!imageSrc && !imageFailed;

  return (
    <li className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] w-full bg-muted">
        {showImage ? (
          // User-supplied remote URL; next/image would need every possible host
          // allow-listed in next.config up front.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc!}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
            <ImageOff className="h-8 w-8" />
          </div>
        )}

        {isOwner && (
          // Always visible on touch devices (no hover there); fades in on pointer devices.
          <div className="absolute right-2 top-2 flex gap-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <IconAction label={t('editWork')} onClick={onEdit} icon={Pencil} />
            <IconAction label={t('deleteWork')} onClick={onDelete} icon={Trash2} destructive />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {item.category && (
          <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {item.category}
          </span>
        )}
        <h3 className="break-words font-semibold leading-snug">{item.title}</h3>
        {item.description && (
          <p className="break-words text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-auto inline-flex w-fit items-center gap-1.5 pt-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            {t('viewWork')}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </li>
  );
}

function IconAction({
  label,
  onClick,
  icon: Icon,
  destructive,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Pencil;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-md bg-background/90 p-1.5 shadow-sm backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        destructive ? 'text-destructive hover:bg-destructive/10' : 'hover:bg-accent',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/* -------------------------------------------------------------------------- */

const EMPTY_FORM: PortfolioItemInput = {
  title: '',
  category: '',
  description: '',
  imageUrl: '',
  link: '',
};

/** Add (`item === null`) or edit one work — same form either way. */
function PortfolioFormDialog({
  item,
  onClose,
  onSaved,
}: {
  item: PortfolioItem | null;
  onClose: () => void;
  onSaved: (item: PortfolioItem, wasNew: boolean) => void;
}) {
  const t = useTranslations('freelancer');
  const [form, setForm] = useState<PortfolioItemInput>(
    item
      ? {
          title: item.title,
          category: item.category ?? '',
          description: item.description ?? '',
          imageUrl: item.imageUrl ?? '',
          link: item.link ?? '',
        }
      : EMPTY_FORM,
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof PortfolioItemInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setTitleError(t('errTitleRequired'));
      return;
    }
    setTitleError(null);
    setError(null);
    setSaving(true);
    try {
      // Empty strings are meaningful on PATCH — the server treats them as
      // "clear this field" — so the whole form is sent on edit.
      const payload: PortfolioItemInput = {
        title: form.title.trim(),
        category: form.category?.trim(),
        description: form.description?.trim(),
        imageUrl: form.imageUrl?.trim(),
        link: form.link?.trim(),
      };
      const saved = item
        ? await api.updatePortfolioItem(item.id, payload)
        : await api.addPortfolioItem(payload);
      onSaved(saved, !item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? t('editWork') : t('addWork')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label={t('workTitle')} error={titleError ?? undefined}>
            <input
              value={form.title}
              onChange={set('title')}
              aria-invalid={!!titleError}
              className={inputCls}
              autoFocus
            />
          </Field>

          <Field label={t('workCategory')}>
            <input
              value={form.category}
              onChange={set('category')}
              placeholder={t('workCategoryPlaceholder')}
              className={inputCls}
            />
          </Field>

          <Field label={t('workDescription')}>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              className={cn(inputCls, 'resize-y')}
            />
          </Field>

          <ImageDropzone
            label={t('workImage')}
            value={form.imageUrl ?? ''}
            onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
          />

          <Field label={t('workLink')}>
            <input
              type="url"
              value={form.link}
              onChange={set('link')}
              placeholder="https://…"
              className={inputCls}
            />
          </Field>

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

function DeleteWorkDialog({
  item,
  onClose,
  onDeleted,
}: {
  item: PortfolioItem;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations('freelancer');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.deletePortfolioItem(item.id);
      onDeleted(item.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('deleteError'));
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteWork')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {t('deleteWorkConfirm', { title: item.title })}
        </p>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? t('saving') : t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
