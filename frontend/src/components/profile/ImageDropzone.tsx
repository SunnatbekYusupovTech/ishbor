'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, Link2, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import {
  ACCEPT_ATTR,
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  formatBytes,
  resolveImageUrl,
} from '@/lib/images';
import { inputCls } from '@/components/form-field';
import { cn } from '@/lib/utils';

/**
 * Picks one image, by any of the ways people actually expect to:
 *   - dragging a file onto the box,
 *   - clicking it to open the OS file picker,
 *   - pasting an image from the clipboard while it's focused,
 *   - or pasting a URL, via the collapsible fallback.
 *
 * The file is uploaded immediately (`POST /uploads/image`) and the resulting
 * stored reference is handed to `onChange`, so the parent form only ever
 * deals with a string — the same shape a pasted URL produces. `''` means
 * "cleared", which the API turns into an unset field.
 */
export function ImageDropzone({
  value,
  onChange,
  label,
  /** `cover` for wide banners, `avatar` for the round 1:1 preview. */
  variant = 'card',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  variant?: 'card' | 'cover' | 'avatar';
  className?: string;
}) {
  const t = useTranslations('freelancer');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  // A newly-chosen image should get a fresh chance to render even if the
  // previous one was broken.
  useEffect(() => setPreviewFailed(false), [value]);

  const upload = useCallback(
    async (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError(t('errImageType'));
        return;
      }
      // Checked here purely so an oversized file fails instantly instead of
      // after a long upload; the server enforces the real limit.
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(t('errImageTooLarge', { max: formatBytes(MAX_UPLOAD_BYTES) }));
        return;
      }

      setError(null);
      setUploading(true);
      try {
        const { url } = await api.uploadImage(file);
        onChange(url);
      } catch (err) {
        // `status: 0` means the request never reached the server (API down, or
        // this origin blocked by CORS) — a very different fix from a rejection
        // the server actually sent back, so it gets its own message.
        if (err instanceof ApiError) setError(err.status === 0 ? t('errNetwork') : err.message);
        else setError(t('errUploadFailed'));
      } finally {
        setUploading(false);
      }
    },
    [onChange, t],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files)[0];
    if (file) {
      e.preventDefault();
      void upload(file);
    }
  };

  const preview = resolveImageUrl(value);
  const showPreview = !!preview && !previewFailed;

  return (
    <div className={className}>
      <span className="mb-1 block text-sm font-medium">{label}</span>

      <div
        // `button` rather than a real <button>: it contains its own controls
        // (remove), and nesting interactive elements inside a button is invalid.
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onPaste={onPaste}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          dragging ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/60 hover:bg-accent/40',
          variant === 'cover' && 'aspect-[16/5] w-full',
          variant === 'avatar' && 'aspect-square w-28 rounded-full',
          variant === 'card' && 'aspect-[16/10] w-full',
          uploading && 'pointer-events-none opacity-70',
        )}
      >
        {showPreview && (
          // User image, possibly on an external host; next/image would need
          // every host allow-listed in next.config up front.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setPreviewFailed(true)}
          />
        )}

        {/* Prompt: always shown when empty, and on hover over an existing image. */}
        <div
          className={cn(
            'relative z-10 flex flex-col items-center gap-1.5 px-3 py-4 transition-opacity',
            showPreview &&
              'bg-background/80 opacity-0 backdrop-blur-sm group-hover:opacity-100 group-focus-within:opacity-100',
            showPreview && 'absolute inset-0 justify-center',
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-medium">{t('uploading')}</span>
            </>
          ) : (
            <>
              {dragging ? (
                <UploadCloud className="h-6 w-6 text-primary" />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
              )}
              {variant !== 'avatar' && (
                <>
                  <span className="text-xs font-medium">
                    {dragging ? t('dropHere') : t('dropzonePrompt')}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {t('dropzoneHint', { max: formatBytes(MAX_UPLOAD_BYTES) })}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {showPreview && !uploading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // don't also open the file picker
              onChange('');
              setError(null);
            }}
            aria-label={t('removeImage')}
            title={t('removeImage')}
            className="absolute right-2 top-2 z-20 rounded-md bg-background/90 p-1.5 text-destructive shadow-sm backdrop-blur transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            // Reset so re-picking the SAME file still fires `change`.
            e.target.value = '';
          }}
        />
      </div>

      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}

      {/* Pasting a URL stays available — it's how existing profiles were
          filled in, and some users would rather link than upload. */}
      <button
        type="button"
        onClick={() => setShowUrlInput((v) => !v)}
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        <Link2 className="h-3 w-3" />
        {showUrlInput ? t('hideUrlInput') : t('orPasteUrl')}
      </button>

      {showUrlInput && (
        <input
          type="url"
          value={value.startsWith('/uploads/') ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className={cn(inputCls, 'mt-1.5')}
        />
      )}
    </div>
  );
}
