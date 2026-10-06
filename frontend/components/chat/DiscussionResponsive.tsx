"use client";

import Link from "next/link";
import { useEffect } from "react";
import ChatWorkspace from "./ChatWorkspace";
import { useMediaQuery } from "./useMediaQuery";

/**
 * Discussion page body. Below `lg` the chat is a full-screen, WhatsApp-style overlay that covers all
 * dashboard chrome; from `lg` up it is the normal framed page. Only one chat instance is ever mounted.
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
      <div className="fixed inset-0 z-[100] overflow-hidden bg-white">
        <ChatWorkspace variant="app" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/student"
        className="mb-3 inline-block text-sm font-medium text-brand-muted hover:text-brand-primary"
      >
        ← Back to Dashboard
      </Link>
      <ChatWorkspace variant="page" />
    </div>
  );
}
