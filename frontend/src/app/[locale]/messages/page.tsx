'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError, tokenStore } from '@/lib/api';
import { getChatSocket, CHAT_READ_EVENT } from '@/lib/chatSocket';
import type { ApplicationStatus, ChatConversation, ChatMessage } from '@/types/domain';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * /messages — the live chat inbox (employer ↔ seeker), one system with the
 * job-request flow: a request auto-creates its thread here, and the request's
 * status (pending/accepted/rejected) shows as a chip in the thread header.
 *
 * Real-time via the shared `/chat` socket: incoming messages upsert into the
 * open thread instantly and bump the inbox preview/unread for the rest.
 */
export default function MessagesPage() {
  const t = useTranslations('chat');
  const router = useRouter();

  const [authed, setAuthed] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Refs so socket handlers always read the latest state without re-binding.
  const activeIdRef = useRef<string | null>(null);
  const meIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  useEffect(() => {
    if (conversations[0]?.meId) meIdRef.current = conversations[0].meId;
  }, [conversations]);

  // Auth guard + `?convo=` deep link (e.g. "Xabarlarga o'tish" after applying).
  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace('/login');
      return;
    }
    setAuthed(true);
    const params = new URLSearchParams(window.location.search);
    const convo = params.get('convo');
    if (convo) setActiveId(convo);
  }, [router]);

  const loadConversations = useCallback(() => {
    api
      .listConversations()
      .then((data) => {
        setConversations(data);
        setLoadedOnce(true);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('loadError'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  /** Mark a thread read on the server, then tell `useChatUnread` (header
   *  badge) to recompute — the socket's `chat:read` only notifies the OTHER
   *  participant, so the reader's own badge would stay stale until refresh. */
  const markRead = useCallback((convoId: string) => {
    api
      .markConversationRead(convoId)
      .then(() => window.dispatchEvent(new Event(CHAT_READ_EVENT)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!authed || loadedOnce) return;
    loadConversations();
  }, [authed, loadedOnce, loadConversations]);

  const upsertMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }, []);

  /** Which conversation's messages are currently loaded in state. */
  const loadedForRef = useRef<string | null>(null);

  // Selecting a thread just records the id; the effect below loads its
  // messages (and marks it read). Keeping the two apart means a `?convo=`
  // deep link — e.g. "Xabarlarga o'tish" right after applying — works even
  // though the inbox list may not have finished loading yet.
  const openConversation = useCallback((id: string) => {
    setActiveId(id);
    setError(null);
  }, []);

  // Load + mark-read whenever the ACTIVE conversation exists in the list but
  // its messages aren't loaded yet (covers clicks AND deep links).
  const active = conversations.find((c) => c.id === activeId) ?? null;
  useEffect(() => {
    if (!active || loadedForRef.current === active.id) return;
    loadedForRef.current = active.id;
    setMessages([]);
    setHasMore(false);
    setMessagesLoading(true);

    // Opening the thread = reading it.
    setConversations((prev) => prev.map((c) => (c.id === active.id ? { ...c, unreadCount: 0 } : c)));
    markRead(active.id);

    api
      .getMessages(active.id)
      .then((page) => {
        setMessages(page.messages);
        setHasMore(page.hasMore);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t('loadError')))
      .finally(() => setMessagesLoading(false));
  }, [active, t, markRead]);

  const loadMore = useCallback(
    (before: string) => {
      if (!activeIdRef.current || messagesLoading) return;
      setMessagesLoading(true);
      api
        .getMessages(activeIdRef.current, before)
        .then((page) => {
          setMessages((prev) => [...page.messages.filter((m) => !prev.some((x) => x.id === m.id)), ...prev]);
          setHasMore(page.hasMore);
        })
        .catch(() => {})
        .finally(() => setMessagesLoading(false));
    },
    [messagesLoading],
  );

  const send = useCallback(async (text: string) => {
    const convoId = activeIdRef.current;
    if (!convoId) return;
    const msg = await api.sendMessage(convoId, text);
    upsertMessage(msg);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convoId
          ? { ...c, lastMessage: { id: msg.id, text: msg.text, senderId: msg.senderId, createdAt: msg.createdAt }, lastMessageAt: msg.createdAt }
          : c,
      ),
    );
  }, [upsertMessage]);

  // --- Live socket wiring ---
  useEffect(() => {
    if (!authed) return;
    const socket = getChatSocket();
    socket.connect();

    const onMessage = (payload: { conversationId: string; message: ChatMessage }) => {
      const { conversationId, message } = payload;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: { id: message.id, text: message.text, senderId: message.senderId, createdAt: message.createdAt },
                lastMessageAt: message.createdAt,
                // The active thread is being read — don't count its own messages as unread.
                unreadCount: c.id === activeIdRef.current ? 0 : c.unreadCount + 1,
              }
            : c,
        ),
      );
      if (conversationId === activeIdRef.current) {
        upsertMessage(message);
        // Reading it here — the sender's receipt updates live.
        markRead(conversationId);
      }
    };

    const onConversation = () => loadConversations();
    const onAppUpdated = (payload: { applicationId: string; status: ApplicationStatus }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.applicationId === payload.applicationId
            ? { ...c, application: { id: payload.applicationId, status: payload.status } }
            : c,
        ),
      );
    };
    const onRead = (payload: { conversationId: string; byUserId: string }) => {
      const meId = meIdRef.current;
      if (payload.conversationId !== activeIdRef.current || !meId || payload.byUserId === meId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === meId && !m.readBy.includes(payload.byUserId)
            ? { ...m, readBy: [...m.readBy, payload.byUserId] }
            : m,
        ),
      );
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:conversation', onConversation);
    socket.on('chat:application-updated', onAppUpdated);
    socket.on('chat:read', onRead);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:conversation', onConversation);
      socket.off('chat:application-updated', onAppUpdated);
      socket.off('chat:read', onRead);
    };
  }, [authed, upsertMessage, loadConversations, markRead]);

  // Join the open thread's room so scoped events could reach us.
  useEffect(() => {
    if (!authed) return;
    const socket = getChatSocket();
    if (activeId) socket.emit('chat:join', activeId);
    return () => {
      if (activeId) socket.emit('chat:leave', activeId);
    };
  }, [activeId, authed]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex h-[calc(100dvh-8.5rem)] min-h-[420px] md:h-[calc(100dvh-10rem)]">
          {/* Inbox pane */}
          <div className={cn('w-full md:block md:w-80 md:shrink-0 md:border-r', activeId && 'hidden')}>
            <ConversationList
              conversations={conversations}
              activeId={activeId}
              meId={meIdRef.current ?? ''}
              loading={loading}
              onSelect={openConversation}
            />
          </div>

          {/* Thread pane */}
          <div className={cn('min-w-0 flex-1 flex-col', !activeId && 'hidden md:flex')}>
            {error && !active && (
              <div className="p-4">
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}
            {active ? (
              <ChatWindow
                conversation={active}
                messages={messages}
                loading={messagesLoading && messages.length === 0}
                hasMore={hasMore}
                meId={meIdRef.current ?? ''}
                onLoadMore={loadMore}
                onSend={(text) =>
                  send(text).catch((err) => setError(err instanceof ApiError ? err.message : t('loadError')))
                }
                onBack={() => setActiveId(null)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 opacity-40" />
                <p className="max-w-sm text-sm">{t('emptyPane')}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/">{t('emptyCta')}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
