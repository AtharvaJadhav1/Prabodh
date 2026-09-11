import { IndustryMentorProvider } from "../../../components/industry/IndustryMentorProvider";

export default function IndustryDashboardLayout({ children }: { children: React.ReactNode }) {
  return <IndustryMentorProvider>{children}</IndustryMentorProvider>;
}
