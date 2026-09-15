"use client";

import { useState } from "react";
import { diceBearUrl, type AvatarStyle } from "../../lib/avatar";
import { useTeam } from "./TeamProvider";

const AVATAR_STYLES: AvatarStyle[] = ["adventurer", "bottts-neutral", "fun-emoji"];

export default function InteractiveTeamAvatar({
  teamName,
  teamId,
}: {
  teamName: string;
  teamId?: string;
}) {
  const { teamAvatarCount, cycleTeamAvatar } = useTeam();
  const [isSpinning, setIsSpinning] = useState(false);

  const handleShuffle = () => {
    setIsSpinning(true);
    cycleTeamAvatar();
    setTimeout(() => setIsSpinning(false), 300);
  };

  const currentStyle = AVATAR_STYLES[teamAvatarCount % AVATAR_STYLES.length];
  const seed = `${teamName || "team"}-${teamId || ""}-${teamAvatarCount}`;
  const avatarUrl = diceBearUrl(seed, currentStyle);

  return (
    <div
      onClick={handleShuffle}
      title="Click to randomize team avatar"
      className={`group relative flex h-14 w-14 shrink-0 select-none cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-[#C25E26]/40 bg-[#FAF7F2] shadow-sm transition-all duration-300 hover:scale-105 hover:border-[#C25E26] hover:shadow-md active:scale-95 sm:h-16 sm:w-16 ${
        isSpinning ? "rotate-12 scale-105" : ""
      }`}
    >
      <img
        src={avatarUrl}
        alt={`${teamName} avatar`}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-[#4A2810]/10 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}