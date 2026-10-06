"use client";

import { useEffect, useState } from "react";
import DangerZoneDeleteAccount from "../../../../components/account/DangerZoneDeleteAccount";
import AdminShell from "../../../../components/admin/AdminShell";
import TextInput from "../../../../components/profile/TextInput";
import AvatarPickerModal from "../../../../components/dashboard/AvatarPickerModal";
import Avatar from "../../../../components/Avatar";
import { CameraIcon } from "../../../../components/dashboard/icons";
import { useAuth } from "../../../../components/auth/AuthProvider";
import { apiPatch } from "../../../../lib/api";
import { avatarUrlFrom } from "../../../../lib/avatar";
import { WAVES_PRESET_LIST, buildWavesAvatarUrl } from "../../../../lib/mentorAvatar";

export default function AdminProfilePage() {
  const { session, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    setName(session.fullName);
    setDepartment(session.department ?? "");
  }, [session]);

  const saveAvatar = async (avatarUrl: string | null) => {
    setAvatarBusy(true);
    try {
      await apiPatch("/me", { profileJson: { avatarUrl } });
      await refreshMe();
    } finally {
      setAvatarBusy(false);
    }
  };

  const hasCustomAvatar = Boolean(avatarUrlFrom(session?.profileJson));
  const avatarSeed = session?.fullName || session?.email || "admin";
  const avatarSrc = avatarUrlFrom(session?.profileJson) || buildWavesAvatarUrl("muted", avatarSeed);

  return (
    <AdminShell title="Admin Profile">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-6 max-sm:p-4 shadow-sm">
          <div className="relative shrink-0">
            <Avatar
              src={avatarSrc}
              seed={avatarSeed}
              alt={session?.fullName ?? "Administrator"}
              className="h-16 w-16"
            />
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={avatarBusy}
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-primary text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-60"
              aria-label="Change profile photo"
            >
              <CameraIcon className="h-3 w-3" />
            </button>
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-deep">{name || session?.fullName}</h2>
            <p className="text-xs text-brand-muted">Administrator &middot; {session?.email}</p>
            {hasCustomAvatar ? (
              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => void saveAvatar(null)}
                className="mt-1 text-xs font-semibold text-brand-overdue hover:underline disabled:opacity-60"
              >
                Remove photo
              </button>
            ) : null}
          </div>
        </div>

        <AvatarPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSaved={saveAvatar}
          presetStyle={{
            previewSeed: avatarSeed,
            presets: WAVES_PRESET_LIST.map((p) => ({
              key: p.key,
              label: p.label,
              description: p.description,
              buildUrl: (seed) => buildWavesAvatarUrl(p.key, seed),
            })),
          }}
        />

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-sand bg-white p-6 max-sm:p-4 shadow-sm sm:grid-cols-2">
          <TextInput label="Full Name" value={name} onChange={setName} required />
          <TextInput label="Department" value={department} onChange={setDepartment} />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setError("");
            setSaving(true);
            try {
              await apiPatch("/me", { fullName: name, department });
              await refreshMe();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Save failed");
            } finally {
              setSaving(false);
            }
          }}
          className="w-full rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>

        <DangerZoneDeleteAccount />
      </div>
    </AdminShell>
  );
}
