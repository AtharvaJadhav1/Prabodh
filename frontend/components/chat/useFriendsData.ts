"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listFriendRequests, listFriends } from "../../lib/chat-api";
import type { ChatFriend, ChatFriendRequests } from "../../lib/chat-types";
import { useChatPolling } from "./useChatPolling";

const EMPTY: ChatFriendRequests = { incoming: [], outgoing: [] };

export function useFriendsData(enabled: boolean, fast: boolean) {
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [requests, setRequests] = useState<ChatFriendRequests>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const { refresh } = useChatPolling(
    async (signal) => {
      const [f, r] = await Promise.all([listFriends({ signal }), listFriendRequests({ signal })]);
      if (!mounted.current) return;
      setFriends(f.items ?? []);
      setRequests({ incoming: r.incoming ?? [], outgoing: r.outgoing ?? [] });
      setError(null);
      setLoading(false);
    },
    {
      // Poll quicker while the Friends tab is on screen; otherwise just keep the badge fresh.
      intervalMs: fast ? 8_000 : 20_000,
      enabled,
      onError: (err) => {
        if (!mounted.current) return;
        setLoading(false);
        setError(err instanceof Error && err.message ? err.message : "Could not load friends.");
      },
    },
  );

  const removeRequest = useCallback((id: string) => {
    setRequests((p) => ({
      incoming: p.incoming.filter((r) => r.id !== id),
      outgoing: p.outgoing.filter((r) => r.id !== id),
    }));
  }, []);

  const removeFriend = useCallback((userId: string) => {
    setFriends((p) => p.filter((f) => f.id !== userId));
  }, []);

  return { friends, requests, loading, error, refresh, removeRequest, removeFriend };
}
