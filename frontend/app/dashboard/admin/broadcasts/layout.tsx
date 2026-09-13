import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Broadcasts",
  description: "Send and review platform announcements by audience.",
};

export default function AdminBroadcastsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}