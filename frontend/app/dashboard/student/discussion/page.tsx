import type { Metadata } from "next";
import DiscussionResponsive from "../../../../components/chat/DiscussionResponsive";

export const metadata: Metadata = {
  title: "Discussion",
  description: "Team chat, friends and direct messages.",
};

export default function DiscussionPage() {
  return <DiscussionResponsive />;
}
