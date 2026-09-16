export type AvatarStyle = "adventurer" | "bottts-neutral" | "fun-emoji";

const STYLE_BACKGROUNDS: Record<AvatarStyle, string> = {
  adventurer: "f8ede2,fed7aa,fde68a",
  "bottts-neutral": "b6e3f4,c0aede,d1d4f9,ffd5dc",
  "fun-emoji": "f8ede2,fed7aa,fde68a",
};

export function diceBearUrl(seed: string, style: AvatarStyle = "adventurer"): string {
  const s = encodeURIComponent(seed.trim() || "innovator");
  return `https://api.dicebear.com/8.x/${style}/svg?seed=${s}&backgroundColor=${STYLE_BACKGROUNDS[style]}&radius=50`;
}

export function avatarUrlFrom(profileJson?: unknown): string | null {
  if (!profileJson || typeof profileJson !== "object") return null;
  const value = (profileJson as Record<string, unknown>).avatarUrl;
  return typeof value === "string" && value.trim() ? value : null;
}

type AvatarUser = {
  id?: string | null;
  userId?: string | null;
  email?: string | null;
  fullName?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  profileJson?: unknown;
};

export function getUserAvatarUrl(user?: AvatarUser | null): string {
  const src = user?.avatarUrl ?? avatarUrlFrom(user?.profileJson);
  if (src) return src;
  const seed = user?.id ?? user?.userId ?? user?.email ?? user?.fullName ?? user?.name ?? "default-user";
  return diceBearUrl(seed);
}