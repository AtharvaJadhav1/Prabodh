"use client";

import { useEffect } from "react";
import ChatWorkspace from "./ChatWorkspace";
import { useMediaQuery } from "./useMediaQuery";

/**
 * Messages page body. Below `lg` the chat is a full-screen, WhatsApp-style overlay that covers all
 * dashboard chrome; from `lg` up it fills the whole content area beside the sidebar. Only one chat instance is ever mounted.
 */
export default function DiscussionResponsive() {
  const compact = useMediaQuery("(max-width: 1023px)");

  useEffect(() => {
    if (!compact) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [compact]);

  if (compact === null) return null;

  if (compact) {
    return (
      <div className="chat-app fixed inset-0 z-[100] overflow-hidden bg-chat-bg">
        <ChatWorkspace variant="app" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <ChatWorkspace variant="page" fill />
    </div>
  );
}
