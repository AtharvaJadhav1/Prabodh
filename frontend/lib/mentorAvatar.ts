import { avatarUrlFrom } from "./avatar";

/**
 * Mentor-only avatar styling (DiceBear Waves v10.x), kept separate from the student/general
 * `diceBearUrl` helper in `avatar.ts` so changing a mentor preset can never affect students.
 */
export type MentorAvatarType = "INSTITUTE" | "FACULTY" | "INDUSTRY";

export type WavesPresetKey =
  | "sepia"
  | "greyscale"
  | "duotone"
  | "muted"
  | "electric"
  | "pastelWall"
  | "boldPop"
  | "sunrise"
  | "stencil"
  | "animated";

/**
 * All render options from https://www.dicebear.com/styles/waves — every preset is just a
 * query-string fragment, so picking one is free (no extra installs/libraries).
 */
const WAVES_PRESETS: Record<WavesPresetKey, { label: string; description: string; params: string }> = {
  sepia: {
    label: "Sepia",
    description: "Four warm browns behind the waves.",
    params: "backgroundColor=d2b48c,c19a6b,8b5e3c,5c3a21",
  },
  greyscale: {
    label: "Greyscale",
    description: "Four greys, no hue at all.",
    params: "backgroundColor=f1f5f9,cbd5e1,94a3b8,475569",
  },
  duotone: {
    label: "Duotone",
    description: "One indigo, one shape color.",
    params: "backgroundColor=312e81&color=38bdf8",
  },
  muted: {
    label: "Muted",
    description: "Six dusty backgrounds instead of the bright ones.",
    params: "backgroundColor=e2e8f0,cbd5e1,fed7aa,fde68a,c7d2fe,bbf7d0",
  },
  electric: {
    label: "Electric",
    description: "Six backgrounds at full saturation.",
    params: "backgroundColor=22d3ee,a78bfa,f472b6,facc15,34d399,fb7185",
  },
  pastelWall: {
    label: "Pastel Wall",
    description: "Five soft backgrounds.",
    params: "backgroundColor=fde2e4,fad2e1,e2ece9,bee1e6,f0efeb",
  },
  boldPop: {
    label: "Bold Pop",
    description: "Five saturated backgrounds.",
    params: "backgroundColor=ef4444,f97316,eab308,22c55e,3b82f6",
  },
  sunrise: {
    label: "Sunrise",
    description: "A warm gradient behind the waves.",
    params: "backgroundType=gradientLinear&backgroundColor=fde68a,fb923c,f97316",
  },
  stencil: {
    label: "Stencil",
    description: "One background for everyone, only the drawing varies.",
    params: "backgroundColor=e2e8f0&color=334155",
  },
  animated: {
    label: "Animated",
    description: "Turns the style's built-in animation on.",
    params: "animate=true",
  },
};

export function buildWavesAvatarUrl(presetKey: WavesPresetKey, seed: string): string {
  const cleanSeed = encodeURIComponent(seed || "mentor");
  return `https://api.dicebear.com/10.x/waves/svg?seed=${cleanSeed}&${WAVES_PRESETS[presetKey].params}`;
}

export const WAVES_PRESET_LIST: Array<{ key: WavesPresetKey; label: string; description: string }> = (
  Object.keys(WAVES_PRESETS) as WavesPresetKey[]
).map((key) => ({ key, label: WAVES_PRESETS[key].label, description: WAVES_PRESETS[key].description }));

/** Default preset per role, used wherever a mentor hasn't picked one explicitly yet. */
export function getMentorWavesAvatarUrl(mentorType: MentorAvatarType, seed: string): string {
  return buildWavesAvatarUrl(mentorType === "INDUSTRY" ? "duotone" : "muted", seed);
}

/**
 * A mentor's real photo (uploaded, or a Waves preset they picked — either way saved to
 * `profileJson.avatarUrl`) always wins; only an untouched account falls back to the default.
 */
export function resolveMentorAvatarUrl(
  mentorType: MentorAvatarType,
  user: { profileJson?: unknown; email?: string | null; fullName?: string | null },
): string {
  const custom = avatarUrlFrom(user.profileJson);
  if (custom) return custom;
  return getMentorWavesAvatarUrl(mentorType, user.email || user.fullName || "mentor");
}
