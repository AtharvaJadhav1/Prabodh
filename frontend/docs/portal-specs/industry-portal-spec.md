# Industry (Mentor) Portal — Implementation Spec

## 1. Overview

Per the BRD, an Industry Mentor is an external domain expert who views assigned teams, scores, joins review sessions, and flags teams. Today, "Industry Mentor" exists only as data *managed by* the Institute Mentor portal (`app/dashboard/mentor/industry-mentors/page.tsx`, `data/mentorDashboard.ts`'s `IndustryMentor` type, `components/mentor/AddIndustryMentorModal.tsx`) — there is no way for an Industry Mentor to log in and act as themselves. This spec adds that missing self-service side.

**Confirmed flow (from user):** An Institute Mentor invites an Industry Mentor (this already happens on the Mentor side today). The Industry Mentor logs into their own portal and sees pending invites from Institute Mentors. They can accept or decline each invite individually. On accepting an invite from a given Institute Mentor, the Industry Mentor gains visibility into that mentor's assigned groups/teams. **This is many-to-many**: one Industry Mentor can accept invites from, and see groups belonging to, multiple different Institute Mentors; conversely one Institute Mentor's invite can go out to multiple Industry Mentors, and a mentor can select multiple industry mentors at once when inviting.

**Scope constraint:** frontend-only, mock-data-driven, same pattern as the rest of the app.

## 2. Login

- New file: `app/login/industry/page.tsx`, modeled on `app/login/faculty/page.tsx`:
  ```tsx
  import type { Metadata } from "next";
  import LoginShell from "../../../components/login/LoginShell";
  import IndustryMentorForm from "../../../components/login/IndustryMentorForm";

  export const metadata: Metadata = {
    title: "Industry Mentor Console | Smart India Hackathon 2026 Portal | MIT-ADT University",
    description: "Industry Mentor Console — review invites, evaluate assigned teams, and score SIH 2026 projects.",
  };

  export default function IndustryLoginPage() {
    return (
      <LoginShell>
        <IndustryMentorForm />
      </LoginShell>
    );
  }
  ```
- New component: `components/login/IndustryMentorForm.tsx`, modeled on `FacultyForm.tsx` (email + password fields, since `IndustryMentor.email` is the existing identity field in mock data). On submit, `router.push("/dashboard/industry")`.
- Update `components/login/PortalTabs.tsx` — add:
  ```ts
  { key: "industry", label: "Industry Mentor Console", mobile: "Industry", href: "/login/industry" },
  ```

## 3. Routes/Pages

```
app/dashboard/industry/
├── layout.tsx                  wraps IndustryMentorProvider
├── page.tsx                    Overview: pending invites + accepted mentors summary
├── invites/
│   └── page.tsx                 Full pending-invites list (accept/decline)
├── mentors/
│   └── page.tsx                 Accepted Institute Mentors, each expandable to their groups
├── teams/
│   └── page.tsx                 Flattened list of all assigned teams across accepted mentors (scoring/review actions)
└── profile/
    └── page.tsx                 Industry Mentor's own profile
```

## 4. Layout & Providers

`app/dashboard/industry/layout.tsx`:
```tsx
import { IndustryMentorProvider } from "../../../components/industry/IndustryMentorProvider";

export default function IndustryDashboardLayout({ children }: { children: React.ReactNode }) {
  return <IndustryMentorProvider>{children}</IndustryMentorProvider>;
}
```

`components/industry/IndustryMentorProvider.tsx` — built directly on the `MentorRequestProvider.tsx` pattern (same `createContext`/`useState`/`useCallback`/`useMemo` shape), but the "requests" being accepted/declined are `MentorInvite` records (Section 6) instead of `GroupRequest`. Exposes: `pendingInvites`, `acceptedInvites` (or a derived `acceptedMentors` list), `inviteHistory`, `acceptInvite(id)`, `declineInvite(id)`, plus a `selectedMentorIds: string[]` + `toggleMentorSelection(mentorId)` pair of state for the multi-select filtering described in Section 7.

## 5. Shell/Sidebar/TopBar

New files: `components/industry/IndustryShell.tsx`, `IndustrySidebar.tsx`, `IndustryTopBar.tsx` — same structural clone of `MentorShell.tsx`/`MentorSidebar.tsx`/`MentorTopBar.tsx`.

`IndustrySidebar` nav:
```ts
const navSections = [
  {
    heading: "Mentorship",
    items: [
      { label: "Overview", href: "/dashboard/industry", match: "exact", icon: DashboardIcon },
      { label: "Pending Invites", href: "/dashboard/industry/invites", match: "start", icon: InboxIcon, badge: pendingCount > 0 ? String(pendingCount) : undefined },
      { label: "My Mentors", href: "/dashboard/industry/mentors", match: "start", icon: BriefcaseIcon },
      { label: "Assigned Teams", href: "/dashboard/industry/teams", match: "start", icon: FileCheckIcon },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "My Profile", href: "/dashboard/industry/profile", match: "start", icon: PersonIcon },
    ],
  },
];
```
`pendingCount` comes from `useIndustryMentor().pendingInvites.length`, same pattern as `useMentorRequests().pendingCount` in `MentorSidebar.tsx`.

## 6. Data Model

New file `data/industryDashboard.ts`. **Reuse the existing `IndustryMentor` type from `data/mentorDashboard.ts` as-is** for the logged-in industry mentor's own identity (id, name, initials, email, phone, company, designation, expertise). Add the invite/relationship join type here (this is the "other side" of the existing invite flow in the Mentor portal, so field names must line up with what `AddIndustryMentorModal.tsx`/`app/dashboard/mentor/industry-mentors/page.tsx` already produce):

```ts
import type { MentorGroup } from "./mentorDashboard";

export type InviteStatus = "pending" | "accepted" | "declined";

export type MentorInvite = {
  id: string;                      // e.g. "INV-001"
  industryMentorId: string;        // IndustryMentor.id
  instituteMentorId: string;       // stand-in id for the inviting Institute Mentor (single mentor identity today in mock data — see mentorProfile.facultyId)
  instituteMentorName: string;     // e.g. mentorProfile.fullName
  instituteMentorInitials: string;
  status: InviteStatus;
  invitedAt: string;
  respondedAt: string | null;
  groupIds: string[];              // teams under this Institute Mentor, available to the Industry Mentor once accepted
};

export const initialPendingInvites: MentorInvite[] = [ /* seed 2-3 invites, groupIds drawn from allGroups in mentorDashboard.ts */ ];
export const initialInviteHistory: MentorInvite[] = [ /* accepted/declined seed rows */ ];
```

This is deliberately a **join-style list** (`MentorInvite[]`) rather than storing a single `mappedTeamIds` directly on `IndustryMentor`, because the relationship is many-to-many: the same Industry Mentor can have multiple `MentorInvite` rows (one per inviting Institute Mentor), and — once there is more than one Institute Mentor identity in mock data — the same Institute Mentor could invite multiple Industry Mentors, each getting their own `MentorInvite` row.

To resolve "teams visible to this Industry Mentor," derive from accepted invites: `acceptedInvites.flatMap(inv => inv.groupIds)` deduplicated, cross-referenced against `allGroups` from `data/mentorDashboard.ts` for full `MentorGroup` details (title, track, milestone, etc.).

## 7. Feature Logic

- **Accept/decline invite**: mirror `MentorRequestProvider.acceptRequest`/`declineRequest` exactly — on accept, move the `MentorInvite` from `pendingInvites` to `inviteHistory` (or an `acceptedInvites` list) with `status: "accepted"`, `respondedAt` set to today's date using the same `MM/DD/YYYY` formatting helper already written in `MentorRequestProvider.tsx`. Same for decline with `status: "declined"`.
- **My Mentors page**: list of distinct Institute Mentors from `acceptedInvites`, each rendered as a card (model on `components/mentor/IndustryMentorCard.tsx`, mirrored) showing their name, department, and count of groups shared. Clicking a card expands/links to that mentor's groups (filtered `teams` view).
- **Multi-select filtering**: on the My Mentors and Assigned Teams pages, allow the Industry Mentor to select multiple Institute Mentor cards via checkbox (`selectedMentorIds` in the provider). The Assigned Teams table filters to only teams belonging to selected mentors' invites; if no mentor is selected, show teams from all accepted invites. This directly implements the user's "industry mentor can select multiple mentors" requirement.
- **Assigned Teams page**: table/grid of resolved `MentorGroup` records (Section 6), each row showing which Institute Mentor(s) it came from (a team could in theory appear under more than one invite if two mentors share a team — display all attributed mentor names as chips). Score/review actions reuse the existing `score`/`grade`/`publishStatus` fields already on `MentorGroup` — same edit pattern as Institute Mentor evaluation, scoped to view + score only (no publish-status override — that stays an Institute Mentor/Admin action).
- **Cross-reference with the Mentor-side invite flow**: when the Institute Mentor portal's `AddIndustryMentorModal`/`industry-mentors/page.tsx` "invites" an industry mentor today, that action should conceptually create a `MentorInvite` row consumable by this portal. Since both sides are still separate mock data files (no shared backend), this spec's mock seed data should include invites that plausibly correspond to the mentors already seeded in `data/mentorDashboard.ts`'s `initialIndustryMentors` (e.g. `IM265`/Rahul Bhide, `IM194`/Hemant Shanu) so a demo can show a coherent story end-to-end, even though the two portals don't share live state.

## 8. Components to Build

```
components/industry/
├── IndustryShell.tsx
├── IndustrySidebar.tsx
├── IndustryTopBar.tsx
├── IndustryMentorProvider.tsx
├── InviteCard.tsx                pending invite card w/ Accept/Decline buttons (model on components/mentor/GroupCard.tsx)
├── MentorCard.tsx                accepted Institute Mentor summary card w/ selection checkbox (model on components/mentor/IndustryMentorCard.tsx)
├── AssignedTeamsTable.tsx        model on components/mentor/GroupMappingTable.tsx
└── InviteHistoryList.tsx
```
Profile page reuses `components/profile/*` primitives (DrawerShell, TextInput, TextArea, ItemListEditor for `expertise[]`).

## 9. Open Questions / TBD

- Mock data today only has one Institute Mentor identity (`mentorProfile`/`mentor` in `mentorDashboard.ts`). To genuinely demo the many-to-many "multiple mentors invite the same industry mentor" scenario, seed data in `industryDashboard.ts` will need to fabricate 2-3 distinct Institute Mentor names/ids even though only one exists on the Mentor-portal side — flagged here so it isn't mistaken for a real inconsistency.
- Should declining an invite be reversible (Institute Mentor can re-invite) or permanent in mock data? Assumed re-invitable — no state prevents it, matches how `GroupRequestHistoryEntry`/`DECLINED` works today (mentor side already allows this).
