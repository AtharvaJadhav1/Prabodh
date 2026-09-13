"use client";

import { diceBearUrl } from "../lib/avatar";

type AvatarProps = {
  src?: string | null;
  seed: string;
  alt?: string;
  className?: string;
};

export default function Avatar({ src, seed, alt = "", className = "h-10 w-10" }: AvatarProps) {
  return (
    <img
      src={src || diceBearUrl(seed)}
      alt={alt}
      loading="lazy"
      className={`shrink-0 rounded-full bg-[#FAF7F2] object-cover ${className}`}
    />
  );
}