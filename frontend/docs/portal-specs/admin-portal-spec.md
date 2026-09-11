# Admin Portal — Implementation Spec

## 1. Overview

The Admin role is the SIH nodal officer / coordinator. Per the BRD (`SIH_Portal_BRD.docx`), Admin has full platform access: manage users, allocate mentors, configure stages/rubrics, monitor all teams, generate reports, send broadcasts, and override statuses. This portal is the control-plane view over everything the Student and Institute Mentor portals already do.

**Scope constraint (matches the rest of the codebase today):** frontend-only, mock-data-driven. No backend, no API calls, no real auth. All "cross-portal" data the Admin portal shows is read directly from the existing mock data files (`data/studentDashboard.ts`, `data/mentorDashboard.ts`, `data/studentProfile.ts`) plus a new `data/adminDashboard.ts`, all mutated in-memory via React Context exactly like `MentorRequestProvider`/`TeamProvider` do today. Nothing persists across reload — that's consistent with the rest of the app.

## 2. Login

- New file: `app/login/admin/page.tsx` — thin wrapper, modeled exactly on `app/login/faculty/page.tsx`:
  ```tsx
  import type { Metadata } from "next";
  import LoginShell from "../../../components/login/LoginShell";
  import AdminForm from "../../../components/login/AdminForm";

  export const metadata: Metadata = {
    title: "Admin Console | Smart India Hackathon 2026 Portal | MIT-ADT University",
    description: "Admin Console — manage users, mentors, stages, and platform-wide reporting for SIH 2026.",
  };

  export default function AdminLoginPage() {
    return (
      <LoginShell>
        <AdminForm />
      </LoginShell>
    );
  }
  ```
- New component: `components/login/AdminForm.tsx` — copy the structure of `components/login/FacultyForm.tsx` (same field layout/validation UX), relabeled for Admin (e.g. Admin ID / Employee ID + password). On submit, `router.push("/dashboard/admin")` — no real auth check, matching current Student/Faculty forms.
- Update `components/login/PortalTabs.tsx`: add a third tab entry to the `tabs` array:
  ```ts
  { key: "admin", label: "Admin Console", mobile: "Admin", href: "/login/admin" },
  ```
  (Note: Industry and Specialization Lead tabs will also be added here by their respective specs — coordinate so the final array has all 5 entries without duplicate keys.)

## 3. Routes/Pages

```
app/dashboard/admin/
├── layout.tsx                 wraps AdminProvider
├── page.tsx                   Overview / platform metrics
├── users/
│   └── page.tsx                Manage Users (students, institute mentors, industry mentors)
├── mentor-allocation/
│   └── page.tsx                Assign/reassign Institute Mentors to teams
├── stages-rubrics/
│   └── page.tsx                Configure hackathon stages + scoring rubrics
├── broadcasts/
│   └── page.tsx                Send/view announcements to all portals
├── reports/
│   └── page.tsx                Aggregated read-only reporting
└── profile/
    └── page.tsx                Admin's own profile
```

## 4. Layout & Providers

`app/dashboard/admin/layout.tsx`:
```tsx
import { AdminProvider } from "../../../components/admin/AdminProvider";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
```

`components/admin/AdminProvider.tsx` — single Context provider holding all admin-mutable state (broadcasts, stage/rubric config, mentor allocation overrides). It should **import and re-expose read access** to the existing mock arrays (`allGroups`, `initialIndustryMentors`, `mentorProfile` from `data/mentorDashboard.ts`; student data from `data/studentDashboard.ts`) so pages can read cross-portal state without each page importing five different files. Follow the exact `useState`/`useCallback`/`useMemo` + `createContext`/custom hook pattern used in `components/mentor/MentorRequestProvider.tsx`.

## 5. Shell/Sidebar/TopBar

New files: `components/admin/AdminShell.tsx`, `AdminSidebar.tsx`, `AdminTopBar.tsx` — structurally identical to `MentorShell.tsx`/`MentorSidebar.tsx`/`MentorTopBar.tsx` (fixed 72-width sidebar, `mobileOpen` state, `lg:pl-72` content offset, same Tailwind `brand-*` tokens).

`AdminSidebar` nav sections:
```ts
const navSections = [
  {
    heading: "Platform Management",
    items: [
      { label: "Overview", href: "/dashboard/admin", match: "exact", icon: DashboardIcon },
      { label: "Manage Users", href: "/dashboard/admin/users", match: "start", icon: PersonIcon },
      { label: "Mentor Allocation", href: "/dashboard/admin/mentor-allocation", match: "start", icon: BriefcaseIcon, badge: /* pending allocation count */ },
      { label: "Stages & Rubrics", href: "/dashboard/admin/stages-rubrics", match: "start", icon: FileCheckIcon },
      { label: "Broadcasts", href: "/dashboard/admin/broadcasts", match: "start", icon: MessageIcon },
      { label: "Reports", href: "/dashboard/admin/reports", match: "start", icon: CompassIcon },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "My Profile", href: "/dashboard/admin/profile", match: "start", icon: PersonIcon },
    ],
  },
];
```
Reuse icon set from `components/dashboard/icons.tsx` (already has `DashboardIcon`, `PersonIcon`, `BriefcaseIcon`, `FileCheckIcon`, `MessageIcon`, `CompassIcon`, `LogoutIcon`, `XIcon`) — no new icons needed for the base spec.

Logout button: same pattern as `MentorSidebar.tsx` — `router.push("/")`.

## 6. Data Model

New file `data/adminDashboard.ts`:
```ts
export type PlatformMetrics = {
  totalTeams: number;
  totalStudents: number;
  totalInstituteMentors: number;
  totalIndustryMentors: number;
  pendingAllocations: number;
  activeStage: string;
};

export type Broadcast = {
  id: string;
  title: string;
  message: string;
  audience: "all" | "students" | "institute-mentors" | "industry-mentors" | "specialization-leads";
  sentAt: string;
  sentBy: string;
};

export type StageConfig = {
  id: string;
  name: string;
  order: number;
  deadline: string;
  rubricCriteria: { label: string; maxScore: number }[];
  status: "upcoming" | "active" | "closed";
};

export type AdminAllocation = {
  id: string;
  teamId: string;
  teamName: string;
  assignedMentorId: string | null;
  assignedMentorName: string | null;
  status: "unassigned" | "assigned" | "override-pending";
};
```
Seed `initialBroadcasts`, `initialStageConfigs`, and derive `initialAllocations` from `allGroups` in `data/mentorDashboard.ts` (map each group's `teamId`/`teamName` into an `AdminAllocation` row, leaving `assignedMentorId` as the single hardcoded `mentor` from that file since there's currently only one mentor identity in mock data).

`PlatformMetrics` values should be computed in `AdminProvider` from the imported arrays' `.length`, not hardcoded, so Admin's counts genuinely reflect the mock data (e.g. `totalTeams: allGroups.length`, `totalIndustryMentors: initialIndustryMentors.length`).

## 7. Feature Logic

- **Manage Users page**: three tabs/sections (Students, Institute Mentors, Industry Mentors), each a read-only table today (CRUD deferred — see Open Questions) sourced from the respective mock files. Search/filter by name is enough for v1.
- **Mentor Allocation page**: table of `AdminAllocation` rows with a dropdown per row to assign/reassign `assignedMentorId`. Mirror the `assignTeam(teamId, mentorId)` callback pattern already implemented in `app/dashboard/mentor/industry-mentors/page.tsx` (lines defining `assignTeam`) — same reassignment logic (remove from old mentor, add to new), just admin-scoped instead of mentor-scoped and covering Institute Mentors rather than Industry Mentors.
- **Stages & Rubrics page**: list `StageConfig` entries; allow inline edit of `deadline` and `status`, and adding/removing `rubricCriteria` rows using the existing `ItemListEditor`/`StringListEditor` primitives from `components/profile/`.
- **Broadcasts page**: form to add a new `Broadcast` (title, message, audience) prepended to a list; no real delivery, just an in-memory feed — mirrors the "prepend to history" pattern in `MentorRequestProvider.acceptRequest`.
- **Reports page**: pure read-only aggregation — e.g. teams grouped by track (reuse `tracks` from `data/mentorDashboard.ts`), score distribution from `evaluatedGroups`, industry mentor coverage (% of teams with an assigned industry mentor). No new state, just derived `useMemo` views over existing arrays.
- **Override statuses**: any team's `publishStatus`/`score`/`grade` (fields already on `MentorGroup` in `mentorDashboard.ts`) should be admin-editable from the Reports or Mentor Allocation page via a simple inline edit — this is the "override" permission called out in the BRD.

## 8. Components to Build

```
components/admin/
├── AdminShell.tsx
├── AdminSidebar.tsx
├── AdminTopBar.tsx
├── AdminProvider.tsx
├── MetricCards.tsx              platform-wide stat cards (reuse card styling from components/mentor/IndustryMentorMetricCards.tsx)
├── UserTable.tsx                generic table for Students/Institute Mentors/Industry Mentors tabs
├── AllocationTable.tsx          mentor allocation grid (model on components/mentor/GroupMappingTable.tsx)
├── StageRubricEditor.tsx
├── BroadcastForm.tsx
└── BroadcastFeed.tsx
```
Profile page (`app/dashboard/admin/profile/page.tsx`) should reuse `components/profile/*` primitives directly rather than building new ones.

## 9. Open Questions / TBD

- Should "Manage Users" support real add/edit/delete on students and institute mentors in v1, or read-only + delete only (industry mentor add already exists via the Mentor portal's `AddIndustryMentorModal`)? Recommend deferring full CRUD until a backend exists; keep it read-only + reassignment for now.
- Should Admin be able to directly message/broadcast into the Industry portal's invite system, or is Broadcasts purely a separate announcement feed? Assumed separate for this spec.
- No BRD detail on stage/rubric UI beyond "configure" — the shape in Section 6 is a reasonable default but should be confirmed once the actual Stage 1/2/3 rubric criteria are finalized.
