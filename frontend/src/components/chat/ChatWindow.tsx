'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { ArrowLeft, Briefcase, Check, CheckCheck, Send, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { ChatConversation, ChatMessage } from '@/types/domain';
import { Avatar, RatingStars } from '@/components/rating';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

/** The open thread — header (participant + request banner), bubbles, input. */
export function ChatWindow({
  conversation,
  messages,
  loading,
  hasMore,
  meId,
  onLoadMore,
  onSend,
  onBack,
}: {
  conversation: ChatConversation;
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  meId: string;
  onLoadMore: (before: string) => void;
  onSend: (text: string) => void;
  onBack: () => void;
}) {
  const t = useTranslations('chat');
  const format = useFormatter();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const other = conversation.other;
  const handle = other.username ?? other.id;

  // Stick to the bottom unless the user has scrolled up to read history.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, conversation.id]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    // Load older messages when the user reaches the top.
    if (el.scrollTop < 24 && hasMore && messages.length > 0 && !loading) {
      onLoadMore(messages[0].createdAt);
    }
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    setSending(true);
    stickToBottomRef.current = true;
    try {
      await onSend(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('back')}
            className="-ml-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link href={`/u/${handle}` as '/'} className="flex min-w-0 items-center gap-2.5">
            <div className="relative shrink-0">
              <Avatar name={other.name} src={other.avatarUrl} size="sm" />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                  other.isOnline ? 'bg-success' : 'bg-muted-foreground/40',
                )}
              />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                {other.name}
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {other.isOnline ? t('online') : other.specialization || t('offline')}
              </p>
            </div>
          </Link>
          {conversation.application && (
            <span
              className={cn(
                'ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
                statusStyles[conversation.application.status],
              )}
            >
              {t(`status_${conversation.application.status}`)}
            </span>
          )}
        </div>

        {conversation.job && (
          <Link
            href={`/jobs/${conversation.job.id}` as '/'}
            className="mt-2.5 flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {conversation.job.type === 'vacancy' ? t('jobBannerVacancy') : t('jobBannerResume')}:{' '}
              {conversation.job.title}
            </span>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="scrollbar-hide flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {loading && messages.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn('h-10 animate-pulse rounded-2xl bg-muted/50', i % 2 ? 'ml-auto w-2/3' : 'w-1/2')} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            <p>{t('noMessages')}</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === meId;
            const readByOther = m.readBy.length > 1;
            return (
              <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[70%]',
                    mine
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md border bg-card text-foreground',
                  )}
                >
                  <p className="whitespace-pre-line break-words">{m.text}</p>
                  <p
                    className={cn(
                      'mt-1 flex items-center justify-end gap-1 text-[10px]',
                      mine ? 'text-primary-foreground/60' : 'text-muted-foreground',
                    )}
                  >
                    {format.dateTime(new Date(m.createdAt), { hour: '2-digit', minute: '2-digit' })}
                    {mine && (readByOther ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {sending && (
          <div className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:240ms]" />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex items-end gap-2 border-t p-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder={t('typeMessage')}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border bg-card px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
        />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={!draft.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
