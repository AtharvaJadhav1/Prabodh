"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { key: "login", label: "Sign in", href: "/login" },
  { key: "register", label: "Student registration", mobile: "Register", href: "/register" },
];

export default function PortalTabs() {
  const pathname = usePathname();
  const active =
    pathname.startsWith("/register") && !pathname.startsWith("/register/faculty") ? "register" : "login";

  return (
    <div className="mb-8 flex w-full gap-1 rounded-xl border border-brand-sand bg-white p-1 shadow-inner">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex-1 rounded-lg px-3 py-2.5 text-center text-xs font-bold transition-all sm:text-sm ${
              isActive ? "bg-brand-lightOrange text-brand-primary shadow-sm" : "text-brand-muted hover:text-brand-deep"
            }`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.mobile ?? tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
