"use client";

import AdminShell from "../../../../components/admin/AdminShell";
import BroadcastForm from "../../../../components/admin/BroadcastForm";
import BroadcastFeed from "../../../../components/admin/BroadcastFeed";
import { useAdmin } from "../../../../components/admin/AdminProvider";

export default function AdminBroadcastsPage() {
  const { broadcasts, sendBroadcast } = useAdmin();

  return (
    <AdminShell
      breadcrumb={[{ label: "Prabodh Portal" }, { label: "Admin Console" }, { label: "Broadcasts" }]}
      title="Broadcasts"
      subtitle="Send announcements to students, institute mentors, or industry mentors."
      showActions={false}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <BroadcastForm onSend={sendBroadcast} />
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-brand-deep">Sent Broadcasts</h2>
          <BroadcastFeed broadcasts={broadcasts} />
        </div>
      </div>
    </AdminShell>
  );
}
