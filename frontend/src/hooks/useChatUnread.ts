'use client';

import { useEffect, useState } from 'react';
import { api, tokenStore, AUTH_CHANGED_EVENT } from '@/lib/api';
import { getChatSocket, disconnectChatSocket, CHAT_READ_EVENT } from '@/lib/chatSocket';

/**
 * Total unread messages across the signed-in user's conversations — powers
 * the header's chat icon badge and the sidebar link. Refreshes:
 *   - on mount (and whenever the auth marker flips, e.g. after login/logout);
 *   - on any live chat event (`chat:message`, `chat:conversation`,
 *     `chat:application`, ...) so a message arriving while the user sits on
 *     the jobs page bumps the badge immediately.
 *
 * Uses `tokenStore` (not `useCurrentUser`) so it never triggers its own
 * `api.me()` round-trip — the badge is pure UI sugar.
 */
export function useChatUnread(): number {
  const [authed, setAuthed] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const sync = () => setAuthed(tokenStore.get());
    sync();
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!authed) {
      setTotal(0);
      disconnectChatSocket();
      return;
    }

    let alive = true;
    const refresh = () => {
      api
        .listConversations()
        .then((convos) => {
          if (alive) setTotal(convos.reduce((sum, c) => sum + c.unreadCount, 0));
        })
        .catch(() => {
          // Inbox is best-effort — a failed fetch must not crash the header.
        });
    };

    refresh();
    const socket = getChatSocket();
    socket.connect();
    socket.on('connect', refresh);
    socket.on('chat:message', refresh);
    socket.on('chat:conversation', refresh);
    socket.on('chat:application', refresh);
    // The signed-in user reading a thread elsewhere (messages page) clears its
    // unread count server-side; the socket's `chat:read` only reaches the
    // OTHER participant, so we listen for the local signal instead.
    const onLocalRead = () => refresh();
    window.addEventListener(CHAT_READ_EVENT, onLocalRead);

    return () => {
      alive = false;
      socket.off('connect', refresh);
      socket.off('chat:message', refresh);
      socket.off('chat:conversation', refresh);
      socket.off('chat:application', refresh);
      window.removeEventListener(CHAT_READ_EVENT, onLocalRead);
    };
  }, [authed]);

  return total;
}
