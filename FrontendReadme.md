# SIH 2026 Portal — Frontend README

This document describes **only the frontend** (`frontend/`) of the PBL/SIH Portal system, in enough detail for a backend engineer to design a database schema, API contract, and auth system that the frontend can be wired into. **There is currently no backend in this repository.** Every page you see today runs entirely on hardcoded, in-memory mock data — nothing persists across a page reload, and there are no real network calls anywhere in the codebase. This document exists to translate "what the frontend already assumes" into "what the backend needs to provide."

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3.4 (App Router, Turbopack) |
| UI Library | React 19.1 / React DOM 19.1 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 3.4 (custom `brand.*` design tokens, no component library) |
| State | Plain React Context (`createContext` / `useState` / `useCallback`) — no Redux/Zustand/Jotai |
| Data fetching | **None.** All "data" is imported from static `.ts` files under `frontend/data/` |
| Auth | **None.** Login forms exist but do not call any API or store any session |
| Routing | Next.js App Router only (`usePathname`, `useRouter` from `next/navigation`) |

There is no `axios`, `fetch` wrapper, `services/`, or `lib/api.ts` anywhere. Every interactive feature (accept/decline, assign mentor, edit profile, send broadcast, etc.) mutates local component/Context state only.

## 2. Getting Started

```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npx tsc --noEmit  # typecheck only
```

There is no `.env` file needed today because there are no external services configured yet.

## 3. Project Structure

```
frontend/
├── app/                                 Next.js App Router
│   ├── layout.tsx                       Root layout (fonts, metadata, PWA)
│   ├── page.tsx                         Public marketing landing page
│   ├── login/
│   │   ├── student/page.tsx             Student login
│   │   └── faculty/page.tsx             Shared login for Mentor / Admin / Industry Mentor / Specialization Lead
│   └── dashboard/
│       ├── student/                     Student portal (see §5)
│       ├── mentor/                      Institute Mentor portal
│       ├── industry/                    Industry Mentor portal
│       └── admin/                       Admin portal
├── components/
│   ├── landing/                         Public landing page sections
│   ├── login/                           LoginShell, PortalTabs, per-role login forms
│   ├── dashboard/                       Shared + Student-specific dashboard components
│   ├── mentor/                          Institute Mentor components + MentorRequestProvider
│   ├── industry/                        Industry Mentor components + IndustryMentorProvider
│   ├── admin/                           Admin components + AdminProvider
│   ├── profile/                         Shared reusable profile-editing primitives
│   └── dashboard/icons.tsx              Full hand-built SVG icon set (~80 icons)
├── data/                                Mock "backend" — hardcoded TS objects (see §7)
│   ├── studentDashboard.ts
│   ├── studentProfile.ts
│   ├── mentorDashboard.ts
│   ├── industryDashboard.ts
│   └── adminDashboard.ts
├── docs/portal-specs/                   Design specs written before Industry/Admin were implemented
├── public/                              Static assets, PWA manifest/service worker
├── tailwind.config.js                   Design tokens (see §8)
└── package.json
```

## 4. The Established Frontend Pattern (repeats per role)

Every role portal follows the exact same structural pattern. Understanding this pattern is the fastest way to understand what the backend needs to support, because each piece maps to a backend concern:

1. **Login page** (`app/login/<role>/page.tsx`) → wraps a role-specific form component. Submitting the form currently just does `router.push("/dashboard/<role>")` with **no request sent anywhere**. → Backend needs: `POST /auth/login` that validates credentials and returns a session/JWT + the user's role, so the frontend can gate this redirect on a real auth check.
2. **Dashboard layout** (`app/dashboard/<role>/layout.tsx`) → wraps the role's page tree in one or more React Context Providers that hold that role's feature state, seeded from the mock data file.
3. **Shell component** (`<Role>Shell.tsx`) → fixed Sidebar + TopBar + `<main>` content area, mobile-responsive.
4. **Sidebar** (`<Role>Sidebar.tsx`) → hardcoded nav array (label, href, icon, badge count), a profile summary block, and a "Logout" button that currently just does `router.push("/")` with no session teardown. → Backend needs: a real logout/session-invalidate endpoint.
5. **Feature pages** under `app/dashboard/<role>/*/page.tsx` → each composes feature components and reads/writes through the role's Context Provider.
6. **Provider** (`<Role>RequestProvider.tsx` / `<Role>Provider.tsx`) → the "business logic" layer. This is the most important file per role for backend design — it is where every state mutation (accept, decline, assign, score, broadcast, edit) happens client-side today. **Every method exposed by these providers is effectively a proposed API endpoint.**

## 5. Routes & Pages Per Role

### Student (`app/dashboard/student/`)
| Path | Purpose |
|---|---|
| `/dashboard/student` | Team overview |
| `/dashboard/student/group-requests` | Incoming join requests + outgoing invites |
| `/dashboard/student/mentors` | View assigned Institute Mentor |
| `/dashboard/student/problem-statements` | Browse/select a problem statement |
| `/dashboard/student/profile` | Edit own profile (skills, projects, certifications, experience, achievements) |

Providers: `TeamProvider`, `ProfileProvider` (in `components/dashboard/`).

### Institute Mentor / Faculty (`app/dashboard/mentor/`)
| Path | Purpose |
|---|---|
| `/dashboard/mentor` | Assigned groups list, filter/search, pending vs. evaluated |
| `/dashboard/mentor/group-requests` | Accept/decline team allocation requests from Admin |
| `/dashboard/mentor/industry-mentors` | Invite/manage Industry Mentors, map them to teams |
| `/dashboard/mentor/profile` | Edit own faculty profile (expertise, cohorts, track record) |

Provider: `MentorRequestProvider` (in `components/mentor/`).

### Industry Mentor (`app/dashboard/industry/`) — added this session
| Path | Purpose |
|---|---|
| `/dashboard/industry` | Overview: pending invites, accepted mentors, visible teams |
| `/dashboard/industry/invites` | Accept/decline invites from Institute Mentors + response history |
| `/dashboard/industry/mentors` | Multi-select which accepted Institute Mentor(s) to view teams for |
| `/dashboard/industry/teams` | Table of resolved teams, filtered by selected mentor(s), with scores |
| `/dashboard/industry/profile` | Edit own identity + domain expertise |

Provider: `IndustryMentorProvider` (in `components/industry/`).

### Admin (`app/dashboard/admin/`) — added this session
| Path | Purpose |
|---|---|
| `/dashboard/admin` | Platform-wide metrics, unassigned teams, recent broadcasts |
| `/dashboard/admin/users` | Tabbed read-only tables: Students / Institute Mentors / Industry Mentors |
| `/dashboard/admin/mentor-allocation` | Assign/reassign an Institute Mentor to any team |
| `/dashboard/admin/stages-rubrics` | Configure hackathon stages, deadlines, status, rubric criteria |
| `/dashboard/admin/broadcasts` | Send + view platform announcements by audience |
| `/dashboard/admin/reports` | Read-only aggregated reports (allocation coverage, avg score, teams by track) |
| `/dashboard/admin/profile` | Edit own admin identity |

Provider: `AdminProvider` (in `components/admin/`).

### Specialization Lead
**Not implemented.** This role was requested but its responsibilities/permissions are undefined — no route, page, or data model exists for it. See `docs/portal-specs/specialization-lead-portal-spec.md` for the placeholder spec and the open questions that need answers before backend or frontend work should start on it.

## 6. Login & the Role Selector (Important for Auth Design)

There is **one shared login page** for all non-Student roles: `app/login/faculty/page.tsx` → `components/login/FacultyForm.tsx`. It renders a single email+password form with a **role dropdown** (`Admin`, `Mentor`, `Industry Mentor`, `Specialization Lead`) and routes based on the selected role:

```
Admin            → /dashboard/admin
Mentor           → /dashboard/mentor
Industry Mentor  → /dashboard/industry
Specialization Lead → (not wired — shows "not available in this preview yet")
```

There's a **separate** login page for Students: `app/login/student/page.tsx` → `components/login/StudentForm.tsx`.

Both forms currently:
- Do **not** call any API.
- Do **not** validate credentials.
- Do **not** store a token, cookie, or session anywhere.
- Route purely based on client-side form state.

**What the backend needs to provide for real auth:**
1. A single `POST /auth/login` (or a role-aware variant) that accepts credentials and returns the authenticated user's role + a session token (JWT or cookie-based).
2. The frontend's role dropdown implies the **backend, not the user, should be the source of truth for role** — right now the UI *lets the user pick their own role at login*, which only works because there's no real backend. Once real auth exists, the dropdown should likely be replaced by deriving the role from the authenticated account, or validating that the account is actually authorized for the selected role.
3. Route guards / middleware — there are currently **zero** route protections. Anyone can navigate directly to `/dashboard/admin` with no session. A real backend + `middleware.ts` (or equivalent) needs to enforce role-based access per dashboard route.
4. A logout endpoint — every sidebar's "Logout" button just does `router.push("/")` today with no session teardown call.

## 7. Data Models (Mock Shapes → Suggested DB Schema Source)

These are the exact TypeScript shapes the frontend already renders and mutates. **Backend response payloads should match these shapes as closely as possible** to minimize frontend rework when wiring up real APIs.

### `data/studentDashboard.ts`
- `student` — `{ name, initials, role, prn, branch, email }` — the logged-in student's identity.
- `team` — `{ name, id, branch, capacity, quotaLabel, femaleIncluded }`.
- `Member` — `{ name, initials, prn, branch, role: "Leader"|"Member"|null, status: "Verified"|"Invite Pending"|"Empty", female?, inviteEmail? }` — team roster rows.
- `OutgoingInvite` — `{ email, sentAt, status }`.
- `JoinRequest` — `{ initials, name, prn, branch, cgpa, skills[], note, requestedAt, avatarClass }` — incoming requests to join the team.
- `facultyMentor` — assigned Institute Mentor summary shown to the student.
- `deliverables` — array of `{ title, fileName, status, statusTone, tile, actions }` — submission artifacts (PDF, PPT, repo link).
- `problemStatement` — the team's selected/locked problem statement, with `code`, `track`, `status`, `title`, `meta[]`, `preview`, `full[]` (technical scope / expected output sections).
- `SiFolder` / `SiStatement` — the browsable problem-statement catalog (folders like "AI PS For TY & LY", entries with `code, ministry, category, domain, title, description, postedBy, updatedAgo`).
- `ManualFormDefaults` — fields for manually proposing a custom problem statement.

### `data/studentProfile.ts`
- `profile` — full student profile: `initials, fullName, verified, bio, school, prn, team, role, hackathonBadge, contacts{phone,email,github,linkedin,website}, skills{primary[],secondary[],tracks[]}, projects[], certifications[], experience[], achievements[]`.
- Supporting types: `Skill`, `Project`, `Certification`, `Experience`, `Achievement`.
- Note the inline comment on `contacts.phone`: `// visible: self only (enforce via API)` — this is a real access-control requirement the backend must enforce (phone number should not be exposed to other users via the API even though it's in the same object client-side).

### `data/mentorDashboard.ts` (also the base for Industry & Admin data)
- `mentor` — `{ name, initials, title, empId, role }` — logged-in Institute Mentor identity.
- `MentorGroup` — the core "team" record used across Mentor/Industry/Admin portals: `{ teamName, teamId, capacity, track, problemCode, problemTitle, leader, leaderPrn, milestone, domains[], score?, grade?, publishStatus?: "submitted"|"published" }`.
- `pendingGroups`, `evaluatedGroups`, `allGroups` — arrays of `MentorGroup` in different states.
- `tracks` — the fixed list of hackathon tracks (e.g. "AI & FinTech", "Smart Governance") used for filtering everywhere.
- `metrics` — mentor dashboard stat block: `{ assignedTeams, totalStudents, pendingReviews, milestoneDate, daysLeft }`.
- `MentorCohort`, `MentorExpertise`, `MentorTrackRecordEntry` — sub-sections of the mentor's own profile page.
- `IndustryMentor` — `{ id, name, initials, email, phone, company, designation, expertise[], mappedTeamIds[] }` — an Industry Mentor as **managed by** an Institute Mentor (the inverse of the Industry Mentor's own login/portal — see below).
- `domainExpertiseOptions` — fixed list of expertise tags.
- `MentorProfile` — full Institute Mentor profile shape (stats, cohorts, domain expertise, track record).
- `mentorMaxCap` — max number of teams a mentor can accept (business rule enforced client-side only today).
- `GroupRequest` / `GroupRequestHistoryEntry` — the Admin→Institute Mentor team allocation request/response flow: `{ id, teamName, groupId, allocatedRole, track: "Priority Track"|"Standard Track", allocatedAt, leaderName, leaderPrn, leaderInitials, department, memberCount, problemTitle, domains[], repoType }` and its accept/decline history record.

### `data/industryDashboard.ts` (added this session)
- `industryMentor` — the logged-in Industry Mentor's own identity (same shape family as `IndustryMentor` above, but this is *their own* record, not one managed by a mentor).
- `MentorInvite` — **the many-to-many join model** between Institute Mentors and Industry Mentors: `{ id, instituteMentorId, instituteMentorName, instituteMentorInitials, instituteMentorTitle, status: "pending"|"accepted"|"declined", invitedAt, respondedAt, groupIds[] }`. This is the single most important shape for backend schema design in this area — **it should become a proper join table**, not a field on either mentor record, because:
  - One Industry Mentor can have multiple invites (from multiple Institute Mentors).
  - One Institute Mentor's invite can go out to multiple Industry Mentors.
  - Each invite carries its own subset of `groupIds` (an Institute Mentor doesn't necessarily share *all* their teams with every Industry Mentor they invite).
- `resolveGroupsForInvites(invites)` / `mentorsForGroup(invites, teamId)` — pure helper functions the frontend uses to derive "which teams is this Industry Mentor allowed to see" and "which mentor(s) does this team come from." These are exactly the kind of query the backend's `GET /industry-mentor/teams` (or similar) endpoint should perform server-side.

### `data/adminDashboard.ts` (added this session)
- `admin` — `{ name, initials, title, empId, role }`.
- `Broadcast` — `{ id, title, message, audience: "all"|"students"|"institute-mentors"|"industry-mentors", sentAt, sentBy }`.
- `StageConfig` — `{ id, name, order, deadline, rubricCriteria: RubricCriterion[], status: "upcoming"|"active"|"closed" }`, where `RubricCriterion = { label, maxScore }`. This models the hackathon's stage/round structure and scoring rubric — a backend `stages` + `rubric_criteria` table pair maps directly onto this.
- `AdminAllocation` — `{ teamId, teamName, track, assignedMentorId, assignedMentorName, status: "unassigned"|"assigned" }` — currently derived from `allGroups`, one row per team. This is Admin's view of the same team↔mentor relationship the Institute Mentor manages from their own side.
- `availableMentors` — currently just `[mentor]` since there's only one Institute Mentor identity in mock data; a real backend obviously needs a full `institute_mentors` table.
- `platformMetrics()` — computes the Overview page's stat cards from the other arrays' lengths — a good template for a `GET /admin/metrics` aggregate endpoint.

**Cross-cutting note:** `MentorGroup`/`allGroups` is the single source of truth for "a team" across Mentor, Industry, and Admin portals today (each portal's data file imports and re-exports it rather than duplicating it). The backend should have exactly one `teams` table that all three roles' endpoints read from, matching this pattern.

## 8. Design System (must be preserved by any new UI work)

Defined in `tailwind.config.js`:

```js
colors.brand = {
  deep: "#5B2E10",       // headings, primary dark text
  primary: "#D96B27",    // primary actions/accents
  hover: "#BE581A",      // primary hover state
  amber: "#E59850",
  cream: "#FAF8F5",      // page background
  surface: "#FFFFFF",    // card background
  sand: "#EBE3D7",       // borders
  charcoal: "#2B2523",   // body text
  muted: "#706761",      // secondary/muted text
  approved: "#2D7A4F",   // success/positive
  overdue: "#B91C1C",    // error/danger
  pending: "#D96B27",
  lightOrange: "#FBECE0",
  warmBorder: "#F6D5BD",
}
fontFamily.sans = "Plus Jakarta Sans"
fontFamily.serif = "Cinzel"   // headings on landing/login pages
fontFamily.mono = "JetBrains Mono"
```

Every card/table/sidebar/topbar across all four role portals reuses this exact palette and a consistent visual language: `rounded-xl`/`rounded-2xl` cards with `border-brand-sand`, `p-4`–`p-6` padding, `text-[11px]`/`text-xs` micro-labels, and a fixed 72-unit-wide sidebar + sticky topbar shell pattern. Icons are all hand-built inline SVGs in `components/dashboard/icons.tsx` (no icon library dependency).

## 9. What the Backend Needs to Replace (Action Inventory)

Every one of these is currently a pure client-side state mutation inside a Context Provider, with no network call. This is the concrete list of what needs a real API endpoint:

| Provider | Method | Current behavior | Suggested endpoint |
|---|---|---|---|
| `MentorRequestProvider` | `acceptRequest(id)` / `declineRequest(id)` | Moves a `GroupRequest` from pending → history array | `POST /mentor/requests/{id}/accept` / `/decline` |
| `IndustryMentorProvider` | `acceptInvite(id)` / `declineInvite(id)` | Moves a `MentorInvite` from pending → history array | `POST /industry-mentor/invites/{id}/accept` / `/decline` |
| `IndustryMentorProvider` | `toggleMentorSelection(id)` | Client-only UI filter state — no backend needed | n/a (keep client-side) |
| `app/dashboard/mentor/industry-mentors/page.tsx` | `addIndustryMentor`, `updateIndustryMentor`, `assignTeam`, `unmapAll`, `removeMentor` | Institute Mentor invites/manages Industry Mentors and their team mappings | `POST /industry-mentors`, `PATCH /industry-mentors/{id}`, `POST /industry-mentors/{id}/assign`, etc. |
| `AdminProvider` | `assignTeam(teamId, mentorId)` | Reassigns a team's Institute Mentor | `POST /admin/allocations/{teamId}/assign` |
| `AdminProvider` | `sendBroadcast(b)` | Prepends a new `Broadcast` to an in-memory list | `POST /admin/broadcasts` (and students/mentors need `GET /broadcasts` + real delivery, e.g. push/email) |
| `AdminProvider` | `updateStage` / `updateStageRubric` | Edits stage deadline/status/rubric criteria | `PATCH /admin/stages/{id}` |
| `AdminProvider` | `updateTeamScore(teamId, score, grade)` | Admin override of a team's score/grade | `PATCH /admin/teams/{teamId}/score` |
| `TeamProvider` (student) | accept/decline join requests, send/revoke invites | Team roster management | `POST /teams/{id}/join-requests/{reqId}/accept` etc. |
| `ProfileProvider` (student), `MentorProfileProvider`, and the Industry/Admin profile pages | in-place field edits via local `useState` | Editing one's own profile | `PATCH /users/me/profile` (role-specific payload shape per §7) |

None of these currently persist — a full page reload resets every portal back to its seeded mock state.

## 10. Known Gaps / Explicitly Out of Scope Today

- **No backend, no database, no API layer, no auth** — this entire document describes what needs to be built to support the frontend that already exists.
- **No real session/role enforcement** — any URL can be visited directly regardless of "logged in" role.
- **Specialization Lead role is undefined** — do not build backend support for it until product requirements exist (see `docs/portal-specs/specialization-lead-portal-spec.md`).
- **Single hardcoded identity per role** — e.g. only one Institute Mentor (`mentor`/`mentorProfile`) and one Industry Mentor (`industryMentor`) exist in mock data; a real backend obviously needs full multi-tenant tables for every role.
- **No file upload backend** — the Student portal's `deliverables` (PDF/PPT/repo link) are display-only mock entries; there is no upload endpoint, storage bucket, or presigned-URL flow implemented in the frontend to point at yet.
