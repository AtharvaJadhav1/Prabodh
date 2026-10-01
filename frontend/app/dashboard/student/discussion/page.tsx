import type { Metadata } from "next";
import TeamCommentsCard from "../../../../components/dashboard/TeamCommentsCard";

export const metadata: Metadata = {
  title: "Discussion",
  description: "Questions and updates shared with your faculty mentor.",
};

export default function DiscussionPage() {
  return (
    <div className="mx-auto max-w-3xl [&>section]:h-[calc(100dvh-9rem)]">
      <TeamCommentsCard />
    </div>
  );
}
