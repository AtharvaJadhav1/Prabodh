"use client";

import Link from "next/link";

export default function PortalTabs() {
  return (
    <div className="mb-8 w-full">
      <Link
        href="/login"
        className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-[0.98]"
      >
        Sign In
      </Link>
    </div>
  );
}