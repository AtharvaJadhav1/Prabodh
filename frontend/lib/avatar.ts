export type AvatarStyle = "adventurer" | "bottts-neutral";

const STYLE_BACKGROUNDS: Record<AvatarStyle, string> = {
  adventurer: "f8ede2,fed7aa,fde68a",
  "bottts-neutral": "b6e3f4,c0aede,d1d4f9,ffd5dc",
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