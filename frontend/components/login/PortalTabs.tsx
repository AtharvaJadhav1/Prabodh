"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { key: "student", label: "Student Portal", mobile: "Student", href: "/login/student" },
  { key: "faculty", label: "Faculty & Evaluator Console", mobile: "Faculty", href: "/login/faculty" },
];

export default function PortalTabs() {
  const pathname = usePathname();

  return (
    <>
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-amber/30 bg-brand-amber/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-deep">
        <span className="h-2 w-2 animate-pulse rounded-full bg-brand-primary"></span>
        Prabodh Incubation Portal 2026
      </div>

      <div className="mb-8 flex items-center gap-1 rounded-xl border border-brand-sand bg-[#EFE9E0] p-1.5 shadow-inner">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-selected={active}
              className={`flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-all duration-200 ${
                active
                  ? "border border-brand-sand/50 bg-white text-brand-deep shadow-sm"
                  : "text-brand-muted hover:bg-white/60 hover:text-brand-deep"
              }`}
            >
              <span className="sm:hidden">{tab.mobile}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}