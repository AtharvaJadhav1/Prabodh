"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import Avatar from "../Avatar";
import { CameraIcon } from "../dashboard/icons";
import { apiPost } from "../../lib/api";

const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

function mimeFor(file: File) {
  if (file.type && IMAGE_MIME.has(file.type)) return file.type;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 || "");
    };
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}

type Props = {
  userId: string;
  fullName: string;
  avatarSrc: string | null;
  hasCustomAvatar: boolean;
  onSaved: (avatarUrl: string | null) => void;
};

export default function AdminAvatarCell({ userId, fullName, avatarSrc, hasCustomAvatar, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    const mime = mimeFor(file);
    if (!IMAGE_MIME.has(mime)) {
      toast.error("Only PNG, JPEG, WebP or GIF images are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image exceeds the 5MB limit. Pick a smaller photo.");
      return;
    }
    setBusy(true);
    try {
      const dataBase64 = await fileToBase64(file);
      const result = await apiPost<{ avatarUrl: string }>(`/admin/users/${userId}/avatar`, {
        filename: file.name,
        contentType: mime,
        dataBase64,
      });
      onSaved(result.avatarUrl);
      toast.success(`Profile photo updated for ${fullName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resetAvatar = async () => {
    setBusy(true);
    try {
      await apiPost(`/admin/users/${userId}/avatar/reset`, {});
      onSaved(null);
      toast.success(`Profile photo reset for ${fullName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset the photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          setMenuOpen(false);
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="group relative h-8 w-8 shrink-0">
        <Avatar src={avatarSrc} seed={fullName || "user"} className="h-8 w-8" />
        <button
          type="button"
          disabled={busy}
          title={`Change photo for ${fullName}`}
          aria-label={`Change photo for ${fullName}`}
          onClick={() => setMenuOpen((v) => !v)}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent opacity-0 transition-all duration-150 group-hover:bg-black/40 group-hover:text-white group-hover:opacity-100 disabled:cursor-wait"
        >
          {busy ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/60 border-t-white" />
          ) : (
            <CameraIcon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {menuOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="block w-full px-3 py-2 text-left text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              Upload new photo
            </button>
            {hasCustomAvatar ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void resetAvatar();
                }}
                className="block w-full px-3 py-2 text-left text-xs font-medium text-stone-500 hover:bg-stone-50"
              >
                Reset to default avatar
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
