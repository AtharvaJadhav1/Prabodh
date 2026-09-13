import type { Metadata } from "next";
import MentorInvitePanel from "../../../../components/dashboard/MentorInvitePanel";

export const metadata: Metadata = {
  title: "Assigned Mentors",
  description: "Review your institute mentor and industry mentor assignment.",
};

export default function MentorsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <MentorInvitePanel />
    </div>
  );
}
