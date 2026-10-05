"use client";

import ChatWorkspace from "../chat/ChatWorkspace";

/**
 * Dashboard chat card: team and mentor discussion plus 1:1 chats with friends.
 * The whole experience lives in <ChatWorkspace /> so mobile, desktop and the expanded view stay identical.
 */
export default function TeamCommentsCard() {
  return (
    <section aria-label="Messages" className="overflow-hidden rounded-2xl border border-brand-softline bg-white">
      <ChatWorkspace variant="card" />
    </section>
  );
}
