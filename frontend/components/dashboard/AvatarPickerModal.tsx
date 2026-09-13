"use client";

import { useRef, useState } from "react";
import { diceBearUrl, type AvatarStyle } from "../../lib/avatar";
import { useProfile } from "./ProfileProvider";
import { CameraIcon, XIcon, UploadCloudIcon, SparklesIcon } from "./icons";

type Tab = "upload" | "pick";

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
  });
}

const PICK_SEEDS = [
  "Aarav",
  "Diya",
  "Kavya",
  "Rohan",
  "Anaya",
  "Ishaan",
  "Meera",
  "Vivaan",
];

export default function AvatarPickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setAvatarUrl } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seeds, setSeeds] = useState<string[]>(PICK_SEEDS);
  const [style, setStyle] = useState<AvatarStyle>("adventurer");

  if (!open) return null;

  const shuffle = () => {
    setSeeds(PICK_SEEDS.map((s) => `${s}${Math.floor(Math.random() * 9000)}`));
  };

  const pick = (seed: string) => {
    void (async () => {
      setBusy(true);
      try {
        await setAvatarUrl(diceBearUrl(seed, style));
        onClose();
      } catch {
        setError("Could not save the avatar. Please try again.");
      } finally {
        setBusy(false);
      }
    })();
  };

  const handleFile = async (file: File) => {
    setError("");
    if (!IMAGE_MIME.has(mimeFor(file))) {
      setError("Only PNG, JPEG, WebP or GIF images are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image exceeds the 5MB limit. Pick a smaller photo.");
      return;
    }
    setBusy(true);
    try {
      const { apiPost } = await import("../../lib/api");
      const dataBase64 = await fileToBase64(file);
      const result = await apiPost<{ avatarUrl: string }>("/me/avatar", {
        filename: file.name,
        contentType: mimeFor(file),
        dataBase64,
      });
      await setAvatarUrl(result.avatarUrl);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#2A1408]/60" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl border border-brand-softline bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-softline px-5 py-4">
          <div className="flex items-center gap-2">
            <CameraIcon className="h-5 w-5 text-brand-primary" />
            <h3 className="text-sm font-bold text-brand-deep">Set your profile photo</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-brand-cream hover:text-brand-deep"
            aria-label="Close avatar picker"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 border-b border-brand-softline px-5 py-3">
          {(
            [
              { key: "upload", label: "Upload photo" },
              { key: "pick", label: "Pick an avatar" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                tab === t.key
                  ? "bg-brand-lightOrange text-brand-primary shadow-sm"
                  : "text-brand-muted hover:text-brand-deep"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-5">
          {tab === "upload" ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-softline bg-brand-canvas/60 px-4 py-8 text-center transition-colors hover:border-brand-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                  <UploadCloudIcon className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-brand-deep">
                  {busy ? "Uploading…" : "Choose a photo from your device"}
                </span>
                <span className="text-xs text-brand-muted">PNG, JPEG, WebP or GIF • up to 5 MB</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {(["adventurer", "bottts-neutral"] as AvatarStyle[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStyle(s)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                        style === s
                          ? "bg-brand-lightOrange text-brand-primary shadow-sm"
                          : "bg-brand-cream text-brand-muted hover:text-brand-deep"
                      }`}
                    >
                      {s === "adventurer" ? "Gen-Z" : "Botts"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={shuffle}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-softline bg-white px-3 py-1.5 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-cream"
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Shuffle
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {seeds.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    disabled={busy}
                    onClick={() => pick(seed)}
                    className="group flex flex-col items-center gap-1 rounded-xl border border-brand-softline bg-brand-canvas/40 p-2 transition-all hover:border-brand-primary/50 hover:bg-brand-cream disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <img
                      src={diceBearUrl(seed, style)}
                      alt={`Generated avatar ${seed}`}
                      loading="lazy"
                      className="h-16 w-16 rounded-full object-cover transition-transform group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {error ? <p className="mt-3 text-xs font-medium text-brand-overdue">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}