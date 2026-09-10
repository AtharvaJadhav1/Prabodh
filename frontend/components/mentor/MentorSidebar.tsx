"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { mentor } from "../../data/mentorDashboard";
import {
  DashboardIcon,
  FileCheckIcon,
  CompassIcon,
  MessageIcon,
  PersonIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  LogoutIcon,
  XIcon,
  InboxIcon,
} from "../dashboard/icons";
import { useMentorRequests } from "./MentorRequestProvider";

type Props = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

type NavItem = {
  label: string;
  href: string;
  match: "exact" | "start" | "never";
  icon: typeof DashboardIcon;
  badge?: string;
  chip?: string;
  dot?: boolean;
};

export default function MentorSidebar({ mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { pendingCount } = useMentorRequests();

  const navSections: { heading: string; items: NavItem[] }[] = [
    {
      heading: "Mentorship Management",
      items: [
        { label: "Assigned Groups", href: "/dashboard/mentor", match: "exact", icon: DashboardIcon, badge: "6" },
        { label: "Group Requests", href: "/dashboard/mentor/group-requests", match: "start", icon: InboxIcon, badge: pendingCount > 0 ? String(pendingCount) : undefined },
        { label: "Industry Mentors", href: "/dashboard/mentor/industry-mentors", match: "start", icon: BriefcaseIcon, dot: true },
        { label: "Review & Rubrics", href: "/dashboard/mentor#reviews", match: "never", icon: FileCheckIcon, chip: "3 Pending" },
        { label: "PS Approvals & Guidance", href: "/dashboard/mentor#approvals", match: "never", icon: CompassIcon },
        { label: "Team Queries", href: "/dashboard/mentor#queries", match: "never", icon: MessageIcon, dot: true },
      ],
    },
    {
      heading: "Account & Institutional",
      items: [
        { label: "My Faculty Profile", href: "/dashboard/mentor/profile", match: "start", icon: PersonIcon },
      ],
    },
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-brand-deep/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-brand-sand bg-white transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-brand-sand/70 p-6">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/images/logo/Prabodh_Horizontal_Logo_Web_1000px.png"
                alt="Prabodh"
                width={1000}
                height={233}
                priority
                className="h-9 w-auto"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-brand-amber/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-primary">
                SIH&apos;26
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-1.5 text-brand-muted transition-colors hover:text-brand-deep lg:hidden"
                aria-label="Close sidebar"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-sand bg-brand-cream p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-deep text-xs font-bold text-white">
                {mentor.initials}
              </div>
              <div>
                <p className="text-xs font-bold leading-snug text-brand-deep">{mentor.name}</p>
                <p className="text-brand-muted">{mentor.title}</p>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-brand-approved ring-4 ring-brand-approved/20" title="Active Evaluator" />
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navSections.map((section) => (
            <div key={section.heading}>
              <div className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                {section.heading}
              </div>
              {section.items.map((item) => {
                const active =
                  item.match === "exact"
                    ? pathname === item.href
                    : item.match === "start"
                    ? pathname.startsWith(item.href)
                    : false;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-all ${
                      active
                        ? "bg-brand-lightOrange font-bold text-brand-primary shadow-sm"
                        : "font-medium text-brand-muted hover:bg-brand-cream hover:text-brand-deep"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${active ? "text-brand-primary" : "text-brand-muted group-hover:text-brand-deep"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[11px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                    {item.chip && (
                      <span className="rounded border border-brand-amber/40 bg-brand-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-primary">
                        {item.chip}
                      </span>
                    )}
                    {item.dot && (
                      <span className="h-2 w-2 rounded-full bg-brand-primary" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-brand-sand/70 bg-white p-4">
          <div className="mb-2 flex items-center justify-between rounded-xl border border-brand-sand/80 bg-brand-cream p-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-4 w-4 text-brand-approved" />
              <span className="font-medium text-brand-charcoal">EMP: {mentor.empId}</span>
            </div>
            <span className="rounded bg-brand-approved/10 px-2 py-0.5 text-[10px] font-bold text-brand-approved">
              Verified
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-brand-deep transition-colors hover:bg-brand-cream hover:text-brand-primary"
          >
            <LogoutIcon className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
