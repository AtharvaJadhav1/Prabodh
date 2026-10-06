import type { Metadata } from "next";
import Link from "next/link";
import ChatWorkspace from "../../../../components/chat/ChatWorkspace";

export const metadata: Metadata = {
  title: "Discussion",
  description: "Team chat, friends and direct messages.",
};

export default function DiscussionPage() {
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
