"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { getUserAvatarUrl } from "../../lib/avatar";
import { useTeam } from "./TeamProvider";
import {
  DashboardIcon,
  FileCodeIcon,
  UserPlusIcon,
  GradCapIcon,
  PersonIcon,
  LogoutIcon,
  LockIcon,
  XIcon,
  PencilIcon,
} from "./icons";

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

const navItems = [
  { label: "Dashboard", href: "/dashboard/student", match: "exact", icon: DashboardIcon },
  {
    label: "Problem Statements",
    href: "/dashboard/student/problem-statements",
    match: "prefix",
    icon: FileCodeIcon,
  },
  {
    label: "Group Requests",
    href: "/dashboard/student/group-requests",
    match: "prefix",
    badge: true,
    icon: UserPlusIcon,
  },
  { label: "Mentors", href: "/dashboard/student/mentors", match: "prefix", chip: "Dual Track", icon: GradCapIcon },
  { label: "Profile", href: "/dashboard/student/profile", match: "exact", icon: PersonIcon },
];

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { filledCount, pendingRequestCount, role, teamName, capacity, team, isLead, renameTeam } = useTeam();
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(teamName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const canRename = isLead && team?.status !== "locked";
  const fullName = session?.fullName ?? "Student";
  const displayName = fullName.length > 16 ? fullName.split(" ")[0] : fullName;
  const profileAvatar = getUserAvatarUrl(session);

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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-brand-softline bg-[#FAF7F2] transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 min-h-[64px] max-h-16 shrink-0 box-border items-center justify-between gap-2 border-b border-brand-softline px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/images/logo/Prabodh_Horizontal_Logo_Web_1000px.png"
              alt="Prabodh"
              width={1000}
              height={233}
              priority
              className="h-10 w-auto"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-white hover:text-brand-deep lg:hidden"
              aria-label="Close sidebar"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-brand-softline px-4 py-4">
          <div className="rounded-2xl border border-brand-softline bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Active Team</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-approved/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-approved">
                <LockIcon className="h-3 w-3" /> {team?.status ?? "forming"}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-sm">
              {editingName ? (
                <form
                  className="min-w-0 flex-1"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const name = draftName.trim();
                    if (!name || savingName) return;
                    setNameError(null);
                    setSavingName(true);
                    try {
                      await renameTeam(name);
                      setEditingName(false);
                      setDraftName(name);
                    } catch (err) {
                      setNameError(err instanceof Error ? err.message : "Unable to rename team.");
                    } finally {
                      setSavingName(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={120}
                      disabled={savingName}
                      autoFocus
                      className="w-full min-w-0 rounded-lg border border-brand-softline px-2 py-1 text-xs font-bold text-brand-deep outline-none focus:border-brand-primary disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={savingName}
                      className="shrink-0 rounded-lg bg-brand-primary px-2 py-1 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-60"
                    >
                      {savingName ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingName(false);
                        setDraftName(teamName);
                        setNameError(null);
                      }}
                      disabled={savingName}
                      className="shrink-0 rounded-lg border border-brand-softline px-1.5 py-1 text-brand-muted hover:text-brand-deep disabled:opacity-60"
                      aria-label="Cancel rename"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {nameError ? (
                    <p className="mt-1.5 text-[11px] font-medium text-red-700">{nameError}</p>
                  ) : null}
                </form>
              ) : (
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate font-extrabold text-brand-deep">{teamName}</span>
                  {canRename && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftName(teamName);
                        setNameError(null);
                        setEditingName(true);
                      }}
                      className="shrink-0 rounded-md p-1 text-brand-muted transition-colors hover:bg-white hover:text-brand-primary"
                      aria-label="Rename team"
                      title="Rename team"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
              <span className="shrink-0 font-semibold text-brand-muted">
                {filledCount}/{capacity}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active =
              item.match === "exact"
                ? pathname === item.href
                : item.match === "prefix"
                  ? pathname.startsWith(item.href)
                  : false;
            const Icon = item.icon;
            const chip =
              item.badge && pendingRequestCount > 0 ? String(pendingRequestCount) : item.chip;

            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch
                onClick={onCloseMobile}
                className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/25"
                    : "text-brand-charcoal/80 hover:bg-white hover:text-brand-deep"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-5 w-5 ${active ? "text-white" : "text-brand-muted group-hover:text-brand-primary"}`}
                  />
                  <span>{item.label}</span>
                </span>
                {chip && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.badge
                        ? "bg-brand-primary text-white"
                        : active
                          ? "bg-white/20 text-white"
                          : "bg-brand-softline text-brand-charcoal/70"
                    }`}
                  >
                    {chip}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-brand-softline px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-brand-softline bg-white p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#FAF7F2] shadow-sm">
                <img
                  src={profileAvatar}
                  alt={session?.fullName || "Profile"}
                  className="h-full w-full object-cover select-none"
                />
              </div>
              <div className="min-w-0">
                <p title={fullName} className="truncate max-w-full text-sm font-bold text-brand-deep">
                  {displayName}
                </p>
                <p className="text-xs font-medium text-brand-muted">{role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold tracking-wide text-white shadow-sm transition-all duration-200 hover:bg-brand-hover hover:shadow-md sm:text-sm"
            >
              <LogoutIcon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}