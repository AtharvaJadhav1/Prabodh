"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createChatHistoryStack, type ChatHistoryStack } from "../../lib/chat-history-stack";

export type { ChatHistoryStack, LayerKind } from "../../lib/chat-history-stack";

/** The chat's layered history manager, shared with nested screens (e.g. the message action sheet). */
export const ChatHistoryContext = createContext<ChatHistoryStack | null>(null);

export function useChatHistoryContext(): ChatHistoryStack | null {
  return useContext(ChatHistoryContext);
}

/**
 * Creates one layered history manager (see lib/chat-history-stack.ts) for the lifetime of the component and
 * keeps it listening to popstate. Unmounting only detaches the listener; history itself is never touched, so
 * navigating away (menu -> Dashboard) leaves the browser stack exactly as it is.
 */
export function useChatHistory(): ChatHistoryStack {
  const [stack] = useState(() =>
    createChatHistoryStack({
      history: () => window.history,
      href: () => window.location.href,
      listen: (fn) => {
        window.addEventListener("popstate", fn);
        return () => window.removeEventListener("popstate", fn);
      },
    }),
  );
  useEffect(() => stack.attach(), [stack]);
  return stack;
}
