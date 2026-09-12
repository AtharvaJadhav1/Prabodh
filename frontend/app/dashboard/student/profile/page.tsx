import DashboardShell from "../../../../components/dashboard/DashboardShell";
import ProfileHeaderCard from "../../../../components/dashboard/ProfileHeaderCard";
import ProfileTabs from "../../../../components/dashboard/ProfileTabs";

export default function StudentProfilePage() {
  return (
    <DashboardShell title="My Profile">
      <div className="mx-auto max-w-5xl space-y-6">
        <ProfileHeaderCard />
        <ProfileTabs />
      </div>
    </DashboardShell>
  );
}
