# Specialization Lead Portal — Implementation Spec

> **Role definition pending — do not implement beyond the basic login/shell scaffold below until responsibilities are confirmed with the user.** "Specialization Lead" does not appear anywhere in the BRD (`SIH_Portal_BRD.docx`), the Technical Design doc, or the existing codebase. This file exists so the project structure is consistent across all three new portals, but its Feature Logic and Data Model sections are intentionally left as placeholders.

## 1. Overview

Unknown/TBD. Working assumption only: a "Specialization Lead" oversees some subset of teams grouped by technical track/specialization (e.g. AI & FinTech, Healthcare & IoT — see `tracks` in `data/mentorDashboard.ts` for the existing track taxonomy), analogous to how an Institute Mentor oversees specific teams. **Do not build features against this assumption — confirm with the user first.**

## 2. Login

Scaffold only, safe to build now since it doesn't depend on unresolved permissions:

- New file: `app/login/specialization-lead/page.tsx`, modeled on `app/login/faculty/page.tsx`:
  ```tsx
  import type { Metadata } from "next";
  import LoginShell from "../../../components/login/LoginShell";
  import SpecializationLeadForm from "../../../components/login/SpecializationLeadForm";

  export const metadata: Metadata = {
    title: "Specialization Lead Console | Smart India Hackathon 2026 Portal | MIT-ADT University",
    description: "Specialization Lead Console for SIH 2026.",
  };

  export default function SpecializationLeadLoginPage() {
    return (
      <LoginShell>
        <SpecializationLeadForm />
      </LoginShell>
    );
  }
  ```
- New component: `components/login/SpecializationLeadForm.tsx`, modeled on `FacultyForm.tsx`. On submit, `router.push("/dashboard/specialization-lead")`.
- Update `components/login/PortalTabs.tsx` — add:
  ```ts
  { key: "specialization-lead", label: "Specialization Lead Console", mobile: "Spec. Lead", href: "/login/specialization-lead" },
  ```

## 3. Routes/Pages

Minimal scaffold only:

```
app/dashboard/specialization-lead/
├── layout.tsx                  wraps SpecializationLeadProvider (empty/placeholder state for now)
├── page.tsx                    Placeholder overview page — "Dashboard content pending role definition"
└── profile/
    └── page.tsx                 Reuse components/profile/* primitives for basic profile display
```
Do not build additional subroutes (team lists, approvals, scoring, etc.) until responsibilities are defined — see Section 9.

## 4. Layout & Providers

`components/specialization-lead/SpecializationLeadProvider.tsx` — stub Context provider following the same `createContext`/custom-hook shape as `MentorRequestProvider.tsx`, but holding no real feature state yet beyond a placeholder (e.g. an empty `assignedTrack: string | null`). Expand once permissions are confirmed.

## 5. Shell/Sidebar/TopBar

`components/specialization-lead/SpecializationLeadShell.tsx`, `SpecializationLeadSidebar.tsx`, `SpecializationLeadTopBar.tsx` — structural clone of `MentorShell.tsx`/`MentorSidebar.tsx`/`MentorTopBar.tsx`.

Sidebar nav — minimal placeholder only:
```ts
const navSections = [
  {
    heading: "Account",
    items: [
      { label: "Overview", href: "/dashboard/specialization-lead", match: "exact", icon: DashboardIcon },
      { label: "My Profile", href: "/dashboard/specialization-lead/profile", match: "start", icon: PersonIcon },
    ],
  },
];
```
Do not add nav items for team lists, approvals, or scoring until the role is defined.

## 6. Data Model

Stub only. New file `data/specializationLeadDashboard.ts`:
```ts
export type SpecializationLeadProfile = {
  initials: string;
  fullName: string;
  assignedTrack: string | null;   // TBD: is this per-track or per-team?
  email: string;
};

export const specializationLeadProfile: SpecializationLeadProfile = {
  initials: "SL",
  fullName: "TBD",
  assignedTrack: null,
  email: "tbd@mituniversity.edu.in",
};
```
No dashboard metrics, team lists, or evaluation data yet — none can be modeled correctly until Section 9 is answered.

## 7. Feature Logic

None yet. This section is intentionally empty pending role definition.

## 8. Components to Build

```
components/specialization-lead/
├── SpecializationLeadShell.tsx
├── SpecializationLeadSidebar.tsx
├── SpecializationLeadTopBar.tsx
└── SpecializationLeadProvider.tsx
```
Only the profile page should reuse `components/profile/*` primitives; no feature-specific components until scope is defined.

## 9. Open Questions / TBD

These need answers from the user before this spec can move past the login/shell scaffold:

1. **Assignment trigger** — Is a Specialization Lead assigned to an entire track/specialization (e.g. all "AI & FinTech" teams) or to specific individual teams, similar to an Institute Mentor?
2. **Dashboard content** — What should their dashboard show: teams within their track, problem statements, mentor assignments, evaluation status, or something else?
3. **Permissions** — Can they approve/reject/score submissions, or are they view-only/advisory (e.g. providing technical guidance without formal evaluation power)?
4. **Assignment authority** — Who assigns a Specialization Lead to a track or team — Admin, or self-selected?
5. **Relationship to existing roles** — Do they interact with Institute Mentors and Industry Mentors directly (e.g. co-review a team), or operate independently at a higher/parallel level?

Once these are answered, this file should be revised to fill in Sections 1 and 6–8 following the same level of detail as `admin-portal-spec.md` and `industry-portal-spec.md`.
