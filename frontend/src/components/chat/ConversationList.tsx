'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import type { ChatConversation } from '@/types/domain';
import { Avatar } from '@/components/rating';
import { cn } from '@/lib/utils';

/** The inbox pane — one row per thread, newest first. */
export function ConversationList({
  conversations,
  activeId,
  meId,
  loading,
  onSelect,
}: {
  conversations: ChatConversation[];
  activeId: string | null;
  meId: string;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('chat');
  const format = useFormatter();

  const timeLabel = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    return format.dateTime(date, sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-bold">{t('title')}</h2>
      </div>

      <div className="scrollbar-hide flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t('empty')}</p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((c) => {
              const mine = c.lastMessage?.senderId === meId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    activeId === c.id ? 'bg-primary/10' : 'hover:bg-accent',
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar name={c.other.name} src={c.other.avatarUrl} size="md" />
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                        c.other.isOnline ? 'bg-success' : 'bg-muted-foreground/40',
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{c.other.name}</p>
                      {c.lastMessage && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {timeLabel(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {c.lastMessage
                          ? `${mine ? t('youPrefix') : ''}${c.lastMessage.text}`
                          : t('startedFromJob', { title: c.job?.title ?? '' })}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
