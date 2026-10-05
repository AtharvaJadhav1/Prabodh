"use client";

import { useState } from "react";
import { initialsOf } from "../../lib/chat-format";
import { GroupIcon } from "./chat-icons";

const TINTS = [
  "bg-[#F6D5BD] text-brand-deep",
  "bg-[#E3EEDD] text-[#2D5A3A]",
  "bg-[#DDE8F3] text-[#26486B]",
  "bg-[#F1E0EE] text-[#6B2A5E]",
  "bg-[#F7EAB8] text-[#6B5410]",
];

function tintFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

type Props = {
  name: string;
  src?: string | null;
  group?: boolean;
  /** Pixel size of the circle. */
  size?: number;
  className?: string;
};

export default function ChatAvatar({ name, src, group, size = 44, className = "" }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImg = !!src && failedSrc !== src;
  const style = { width: size, height: size, minWidth: size, fontSize: Math.max(11, Math.round(size * 0.38)) };
  if (group && !showImg) {
    return (
      <span
        style={style}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-deep text-white ${className}`}
        aria-hidden="true"
      >
        <GroupIcon className="h-1/2 w-1/2" />
      </span>
    );
  }
  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src ?? undefined}
        alt=""
        style={style}
        loading="lazy"
        onError={() => setFailedSrc(src ?? null)}
        className={`shrink-0 rounded-full border border-white bg-brand-cream object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={style}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold ${tintFor(name)} ${className}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
