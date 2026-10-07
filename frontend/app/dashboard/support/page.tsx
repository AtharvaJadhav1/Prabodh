import type { Metadata } from "next";
import DiscussionResponsive from "../../../components/chat/DiscussionResponsive";

export const metadata: Metadata = {
  title: "Support Inbox",
  description: "Every user's conversation with Support.",
};

export default function SupportInboxPage() {
  return <DiscussionResponsive />;
}
