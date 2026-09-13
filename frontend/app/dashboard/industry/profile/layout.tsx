import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Industry Profile",
  description: "Manage your industry mentor identity and domain expertise.",
};

export default function IndustryProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}