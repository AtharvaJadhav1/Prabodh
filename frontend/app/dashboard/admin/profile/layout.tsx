import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Profile",
  description: "View and manage your administrator identity.",
};

export default function AdminProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}