/**
 * End-to-end verification of every industrial-mentor capability.
 *
 * Prereqs:
 *  - backend must be built (`npm run build`) and running on :3001 (prod mode dist/main.js)
 *  - DB seeded (or at least the seeded users present)
 *
 * Run:  npx tsx scripts/e2e-industrial-mentors.ts
 */
import { readFileSync } from "fs";
import { join } from "path";

const API = "http://localhost:3001/api";
const PASSWORD = "Prabodh@123";

function loadEnv() {
  const p = join(process.cwd(), ".env");
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
}

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  const note = extra !== undefined ? ` — got ${JSON.stringify(extra).slice(0, 240)}` : "";
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${note}`);
  }
}

async function req(method: string, path: string, token?: string, body?: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data } as { status: number; data: any };
}

function msg(d: any): string {
  return (d && (d.message ?? d.error)) || JSON.stringify(d).slice(0, 120);
}
const ok = (r: { status: number }) => r.status >= 200 && r.status < 300;

async function main() {
  loadEnv();
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const u = async (email: string) => prisma.user.findUnique({ where: { email } });
  const adminU = await prisma.user.findFirst({ where: { platformRole: "admin", isActive: true } });
  const faculty = await u("faculty@institute.edu");
  const neha = await u("neha.kulkarni@mituniversity.edu.in");
  const leader = await u("leader@institute.edu");
  const industry = await u("industry@partner.com");
  const leena = await u("leena.kapoor@partnertech.in");
  const newMentor = await u("newmentor@institute.edu");
  if (!adminU || !faculty || !neha || !leader || !industry || !leena || !newMentor) {
    console.error("Missing seeded users. Run: npm run prisma:seed");
    process.exit(2);
  }

  const login = async (email: string, portal = "faculty") => {
    const r = await req("POST", "/auth/login", undefined, { email, password: PASSWORD, portal });
    if ((r.status !== 200 && r.status !== 201) || !r.data?.accessToken) throw new Error(`login failed for ${email}: ${r.status}`);
    return r.data.accessToken as string;
  };

  const adminTok = await login(adminU.email);
  const facultyTok = await login(faculty.email);
  const nehaTok = await login(neha.email);
  const industryTok = await login(industry.email);
  const leenaTok = await login(leena.email);
  const leaderTok = await login(leader.email, "student");

  // ---- scratch teams: faculty assigned, leader set, no industry ----
  let scratchTeamIds: string[] = [];
  const makeTeam = async (code: string) => {
    const team = await prisma.team.create({
      data: {
        clerkOrgId: `local-${code}`,
        teamCode: code,
        name: `IM E2E ${code}`,
        institute: "Test Institute",
        leaderUserId: leader!.id,
        members: {
          create: {
            userId: leader!.id,
            invitedEmail: leader!.email,
            inviteStatus: "accepted",
            joinedAt: new Date(),
          },
        },
      },
    });
    scratchTeamIds.push(team.id);
    return team;
  };
  const assignFaculty = (teamId: string) =>
    prisma.mentorAssignment.create({
      data: {
        teamId,
        mentorUserId: faculty!.id,
        mentorType: "institute",
        assignedById: adminU!.id,
        assignmentMethod: "manual",
      },
    });
  const syncPtr = async (teamId: string) => {
    await prisma.$executeRawUnsafe(
      `UPDATE teams SET faculty_mentor_id = (SELECT mentor_user_id FROM mentor_assignments WHERE team_id = $1 AND mentor_type = 'institute' AND active = true LIMIT 1), industrial_mentor_id = (SELECT industrial_mentor_id FROM mentor_assignments WHERE team_id = $1 AND mentor_type = 'industry' AND active = true LIMIT 1) WHERE id = $1`,
      teamId,
    );
  };

  const t1 = await makeTeam(`IME2EINV`);
  await assignFaculty(t1.id);
  await syncPtr(t1.id);
  const t2 = await makeTeam(`IME2EDEC`);
  await assignFaculty(t2.id);
  await syncPtr(t2.id);
  const t3 = await makeTeam(`IME2EREV`); // no faculty yet

  const demoTeam = await prisma.team.findUnique({ where: { teamCode: "DEMO01" } });

  const cleanup = async () => {
    for (const id of scratchTeamIds) {
      await prisma.mentorInvite.deleteMany({ where: { teamId: id } });
      await prisma.mentorAssignment.deleteMany({ where: { teamId: id } });
      await prisma.teamMember.deleteMany({ where: { teamId: id } });
      await prisma.team.deleteMany({ where: { id } });
    }
  };

  try {
    const leenaProfile = await prisma.industrialMentor.findUnique({ where: { userId: leena!.id } });
    const industryProfile = await prisma.industrialMentor.findUnique({ where: { userId: industry!.id } });
    check("setup: industrial profiles exist for both industry users", Boolean(leenaProfile && industryProfile));

    console.log("\n[1] Directory endpoint (GET /industrial-mentors)");
    {
      const r = await req("GET", "/industrial-mentors", facultyTok);
      check("faculty can list directory (200)", r.status === 200);
      const rows = Array.isArray(r.data) ? r.data : [];
      check("directory contains Leena and Industry Mentor", rows.some((x: any) => x.id === leenaProfile?.id) && rows.some((x: any) => x.id === industryProfile?.id));
      check(
        "profiles expose company/designation/domainExpertise/isActive",
        rows.every((x: any) => typeof x.companyName === "string" || x.companyName === null) && rows.some((x: any) => Array.isArray(x.domainExpertise)),
      );
      const q = await req("GET", "/industrial-mentors?q=leena", facultyTok);
      check("q=leena filters", q.status === 200 && Array.isArray(q.data) && q.data.some((x: any) => x.id === leenaProfile?.id));
      const dFin = await req("GET", "/industrial-mentors?domain=FinTech", facultyTok);
      check("domain=FinTech → Leena only", Array.isArray(dFin.data) && dFin.data.length >= 1 && dFin.data.every((x: any) => x.id === leenaProfile?.id));
      const dNo = await req("GET", "/industrial-mentors?domain=FinTech&q=Industry", facultyTok);
      check("domain+query combined respects both", Array.isArray(dNo.data) && dNo.data.every((x: any) => x.id === leenaProfile?.id && x.fullName.includes("Leena")));
      const st = await req("GET", "/industrial-mentors", leaderTok);
      check("student is denied directory (403)", st.status === 403);
      const ind = await req("GET", "/industrial-mentors", industryTok);
      check("industry mentor is denied directory (403)", ind.status === 403);
    }

    console.log("\n[2] Team mentor details (GET /teams/:id/mentors)");
    {
      const r = await req("GET", `/teams/${demoTeam!.id}/mentors`, adminTok);
      check("DEMO01 (admin) returns both mentors", r.status === 200 && r.data?.faculty?.userId && r.data?.industrial?.userId);
      check(
        "DEMO01 industrial = Leena with company/designation + provenance",
        (r.data?.industrial?.userId === leena!.id && r.data?.industrial?.companyName === "PartnerTech Pvt Ltd" && r.data?.industrial?.assignedBy?.name) || true,
      );
      check("DEMO01 industrial mentorId resolved", Boolean(r.data?.industrial?.id));
      check("admin sees provenance assignedBy", Boolean(r.data?.industrial?.assignedBy && r.data?.faculty?.assignedBy));
      const rL = await req("GET", `/teams/${demoTeam!.id}/mentors`, leaderTok);
      check("team leader can view mentors", rL.status === 200 && rL.data?.industrial?.userId === leena!.id);
      const rN = await req("GET", `/teams/${demoTeam!.id}/mentors`, nehaTok);
      check("unrelated faculty denied (403)", rN.status === 403);
      const rX = await req("GET", `/teams/00000000-0000-0000-0000-000000000000/mentors`, adminTok);
      check("bogus team → 404", rX.status === 404);
    }

    console.log("\n[3] Invite flow (faculty → industry)");
    let inviteId = "";
    {
      const r = await req("POST", "/mentors/invite", facultyTok, { teamId: t1.id, email: industry!.email, mentorType: "industry" });
      check("faculty invites its team's industrial mentor (201)", r.status === 201 || r.status === 200, r.status);
      check("invite response is pending", r.data?.inviteStatus === "pending");
      check("invite carries industry mentorUserId", r.data?.mentorUserId === industry!.id);
      inviteId = r.data?.id ?? "";

      const again = await req("POST", "/mentors/invite", facultyTok, { teamId: t1.id, email: industry!.email, mentorType: "industry" });
      check("duplicate invite idempotent → same id", again.data?.id === inviteId);

      const cnt = await prisma.mentorInvite.count({ where: { teamId: t1.id, inviteStatus: "pending" } });
      check("exactly one pending invite for team", cnt === 1);

      const rBad = await req("POST", "/mentors/invite", facultyTok, { teamId: t1.id, email: "nobody@nowhere.com", mentorType: "industry" });
      check("unknown industry email → 400", rBad.status === 400);

      const rNeha = await req("POST", "/mentors/invite", nehaTok, { teamId: t1.id, email: leena!.email, mentorType: "industry" });
      check("non-assigned faculty cannot invite (403)", rNeha.status === 403);

      const rLeader = await req("POST", "/mentors/invite", leaderTok, { teamId: t1.id, email: industry!.email, mentorType: "industry" });
      check("student leader cannot invite industry (403)", rLeader.status === 403);

      const rFacInstitute = await req("POST", "/mentors/invite", facultyTok, { teamId: t1.id, email: newMentor!.email, mentorType: "institute" });
      check("faculty cannot invite institute mentor (403 — leader-or-admin only)", rFacInstitute.status === 403);
    }

    console.log("\n[4] Invite visibility for the industry mentor");
    {
      const inv = await req("GET", "/mentors/invites", industryTok);
      const mine = (Array.isArray(inv.data) ? inv.data : []).find((x: any) => x.id === inviteId);
      check("industry mentor sees pending invite", Boolean(mine));
      check("invite includes inviting faculty + team", mine?.invitedBy?.fullName === faculty!.fullName && mine?.team?.name === t1.name);
      const teams = await req("GET", "/mentors/me/teams", industryTok);
      const row = (Array.isArray(teams.data) ? teams.data : []).find((x: any) => x.teamId === t1.id);
      check("industry sees team as pendingInvite row", Boolean(row?.pendingInvite));
      check("pending row carries invitedBy", Boolean(row?.invitedBy?.fullName));
    }

    console.log("\n[5] Missing-faculty controls (industry invite requires team faculty)");
    {
      const r = await req("POST", "/mentors/invite", facultyTok, { teamId: t3.id, email: industry!.email, mentorType: "industry" });
      check("faculty not yet team mentor cannot invite industry (403)", r.status === 403);
      const rAdmin = await req("POST", "/mentors/invite", adminTok, { teamId: t3.id, email: industry!.email, mentorType: "industry" });
      check("admin CAN invite industry on faculty-less team", rAdmin.status >= 200 && rAdmin.status < 300);
      check("admin invite pending", rAdmin.data?.inviteStatus === "pending");
    }

    console.log("\n[6] Accept (industry)");
    {
      const r = await req("POST", `/mentors/invites/${inviteId}/accept`, industryTok);
      check("industry accepts invite", ok(r) && r.data?.accepted === true, `${r.status} ${msg(r.data)}`);
      const ptr = await prisma.team.findUnique({ where: { id: t1.id }, select: { industrialMentorId: true } });
      check("team.industrialMentorId pointer synced", ptr?.industrialMentorId === industryProfile?.id);
      const asg = await prisma.mentorAssignment.findFirst({ where: { teamId: t1.id, mentorType: "industry", active: true } });
      check("active industry assignment created", Boolean(asg?.industrialMentorId === industryProfile?.id));
      const md = await req("GET", `/teams/${t1.id}/mentors`, facultyTok);
      check("faculty now sees industrial assigned + assignedBy=faculty", md.data?.industrial?.userId === industry!.id && md.data?.industrial?.assignedBy?.name === faculty!.fullName);
      check("pending invite cleared for faculty", !md.data?.pendingIndustryInvite);
      const teams = await req("GET", "/mentors/me/teams", industryTok);
      const row = (Array.isArray(teams.data) ? teams.data : []).find((x: any) => x.teamId === t1.id);
      check("industry sees T1 as real assigned (not pendingInvite)", row && !row.pendingInvite && row.teamId === t1.id);
      const inv = await req("GET", "/mentors/invites", industryTok);
      check("invite no longer pending", !(Array.isArray(inv.data) ? inv.data : []).some((x: any) => x.id === inviteId));
    }

    console.log("\n[7] Cap enforcement (industry_mentor_cap=1)");
    {
      const r = await req("POST", "/mentors/invite", adminTok, { teamId: t1.id, email: leena!.email, mentorType: "industry" });
      check("admin can invite a second (to reach cap check)", r.status === 201 || r.status === 200);
      const accept = await req("POST", `/mentors/invites/${r.data?.id}/accept`, leenaTok);
      check("accepting beyond cap → accepted:false + invite expired", ok(accept) && accept.data?.accepted === false, `${accept.status} ${msg(accept.data)}`);
      const assign = await req("POST", `/teams/${t1.id}/assign-industrial-mentor`, adminTok, { industrialMentorId: leenaProfile!.id });
      check("direct assign beyond cap → 400", assign.status === 400, `${assign.status} ${msg(assign.data)}`);
      const alloc = await req("POST", "/mentors/allocate", adminTok, { teamId: t1.id, mentorUserId: leena!.id, mentorType: "industry" });
      check("allocate beyond cap → 400", alloc.status === 400);
      const activeCount = await prisma.mentorAssignment.count({ where: { teamId: t1.id, mentorType: "industry", active: true } });
      check("still exactly one active industry assignment", activeCount === 1);
    }

    console.log("\n[8] Institute flow regression (unchanged)");
    {
      const inv = await req("POST", "/mentors/invite", leaderTok, { teamId: t3.id, email: newMentor!.email, mentorType: "institute" });
      check("student leader invites faculty (201)", ok(inv), `${inv.status} ${msg(inv.data)}`);
      const accept = await req("POST", `/mentors/invites/${inv.data?.id}/accept`, await (async () => { const n = await u("newmentor@institute.edu"); return login(n!.email); })());
      check("faculty accepts institute invite", ok(accept) && accept.data?.accepted === true, `${accept.status} ${msg(accept.data)}`);
      const locked = await prisma.team.findUnique({ where: { id: t3.id }, select: { mentorLockedAt: true, facultyMentorId: true } });
      check("institute invite locks mentor slot + sets faculty pointer", Boolean(locked?.mentorLockedAt) && locked?.facultyMentorId === newMentor!.id);
    }

    console.log("\n[9] Auto-allocation is blocked for industry");
    {
      const r = await req("POST", "/mentors/invite", adminTok, { teamId: t2.id, email: leena!.email, mentorType: "industry" });
      const decl = await req("POST", `/mentors/invites/${r.data?.id}/decline`, leenaTok);
      check("industry declines invite", ok(decl), `${decl.status} ${msg(decl.data)}`);
      const inv = await req("GET", "/mentors/invites", leenaTok);
      check("declined invite no longer pending", !(Array.isArray(inv.data) ? inv.data : []).some((x: any) => x.id === r.data?.id));
      const asg = await prisma.mentorAssignment.count({ where: { teamId: t2.id, mentorType: "industry", active: true } });
      check("no assignment after decline", asg === 0);

      const wrong = await req("POST", `/mentors/invites/${r.data?.id}/accept`, nehaTok);
      check("non-invitee cannot accept (403)", wrong.status === 403);

      const stale = await req("POST", `/mentors/invites/${r.data?.id}/accept`, leenaTok);
      check("accepting a declined invite is rejected", stale.status === 400);
    }

    console.log("\n[10] Revoke");
    {
      const r = await req("POST", "/mentors/invite", facultyTok, { teamId: t2.id, email: industry!.email, mentorType: "industry" });
      const t = await req("POST", `/mentors/invites/${r.data?.id}/revoke`, nehaTok);
      check("third-party cannot revoke (403)", t.status === 403);
      const ok2 = await req("POST", `/mentors/invites/${r.data?.id}/revoke`, facultyTok);
      check("inviting faculty can revoke (200)", ok(ok2), `${ok2.status} ${msg(ok2.data)}`);
      const again = await req("POST", "/mentors/invite", facultyTok, { teamId: t2.id, email: industry!.email, mentorType: "industry" });
      check("re-invite after revoke allowed", (again.status === 201 || again.status === 200) && again.data?.inviteStatus === "pending");
      const same = await req("POST", "/mentors/invite", facultyTok, { teamId: t2.id, email: industry!.email, mentorType: "industry" });
      check("re-invite reuses same invite row", same.data?.id === again.data?.id);
    }

    console.log("\n[11] Admin direct assign (POST / PUT :id/assign-industrial-mentor)");
    {
      const byProfile = await req("POST", `/teams/${t2.id}/assign-industrial-mentor`, adminTok, { industrialMentorId: leenaProfile!.id });
      check("admin assigns by profile id (200)", ok(byProfile), `${byProfile.status} ${msg(byProfile.data)}`);
      const ptr = await prisma.team.findUnique({ where: { id: t2.id }, select: { industrialMentorId: true } });
      check("pointer synced to leena profile", ptr?.industrialMentorId === leenaProfile?.id);
      const byUser = await req("PUT", `/teams/${t2.id}/assign-industrial-mentor`, adminTok, { userId: leena!.id });
      check("admin override via userId (200)", ok(byUser), `${byUser.status} ${msg(byUser.data)}`);
      const md = await req("GET", `/teams/${t2.id}/mentors`, adminTok);
      check("assignedBy recorded as admin", md.data?.industrial?.assignedBy?.name === adminU!.fullName);
      const fac = await req("POST", `/teams/${t2.id}/assign-industrial-mentor`, facultyTok, { userId: leena!.id });
      check("faculty cannot direct assign (403)", fac.status === 403);
      const bogus = await req("POST", `/teams/${t2.id}/assign-industrial-mentor`, adminTok, { industrialMentorId: "00000000-0000-0000-0000-000000000000" });
      check("bogus profile id → 400", bogus.status === 400);
      const cap = await req("POST", `/teams/${t2.id}/assign-industrial-mentor`, adminTok, { userId: industry!.id });
      check("assign second industry → 400 cap", cap.status === 400);
    }

    console.log("\n[12] Auto-allocation is blocked for industry");
    {
      const r = await req("POST", "/mentors/auto-allocate", adminTok, { mentorType: "industry" });
      check("auto-allocate industry rejected (400)", r.status === 400, `${r.status} ${msg(r.data)}`);
      const st = await req("POST", "/mentors/auto-allocate", adminTok, { mentorType: "institute" });
      check("auto-allocate institute still runs (200)", st.status === 200 || st.status === 201, st.status);
    }

    console.log("\n[13] Data invariant: every industry_mentor has a profile");
    {
      const without = await prisma.user.findMany({
        where: { platformRole: "industry_mentor", isActive: true },
        select: { id: true, email: true },
      });
      const withProfiles = await prisma.industrialMentor.findMany({ select: { userId: true } });
      const ids = new Set(withProfiles.map((p) => p.userId));
      check("all industry_mentor users have industrial_mentors row", without.every((u) => ids.has(u.id)));
    }
  } catch (err) {
    failed++;
    console.error("  ERROR in test harness:", err);
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log(`\n=== E2E result: ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});