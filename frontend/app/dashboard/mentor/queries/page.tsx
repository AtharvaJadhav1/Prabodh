"use client";

import { useCallback } from "react";
import MentorShell from "../../../../components/mentor/MentorShell";
import ChatWorkspace from "../../../../components/chat/ChatWorkspace";
import { useMentorRequests } from "../../../../components/mentor/MentorRequestProvider";
import type { ChatConversation } from "../../../../lib/chat-types";

/**
 * Team Queries: every team this mentor supervises appears as a group conversation in the shared chat
 * workspace, next to 1:1 chats with friends.
 */
export default function MentorQueriesPage() {
  const { markTeamCommentsRead } = useMentorRequests();

  // Keep the older notification-based unread state in sync while the new chat is the place to read.
  const handleViewed = useCallback(
    (conv: ChatConversation) => {
      if (conv.type === "group" && conv.teamId) markTeamCommentsRead(conv.teamId);
    },
    [markTeamCommentsRead],
  );

  return (
    <MentorShell title="Team Queries">
      <ChatWorkspace variant="page" onConversationViewed={handleViewed} />
    </MentorShell>
  );
}
