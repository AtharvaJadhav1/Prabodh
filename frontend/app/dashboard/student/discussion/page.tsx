import type { Metadata } from "next";
import ChatWorkspace from "../../../../components/chat/ChatWorkspace";

export const metadata: Metadata = {
  title: "Discussion",
  description: "Questions and updates shared with your faculty mentor.",
};

export default function DiscussionPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ChatWorkspace variant="page" />
    </div>
  );
}
