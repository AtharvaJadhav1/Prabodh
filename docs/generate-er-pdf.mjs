import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const diagramsDir = path.join(__dirname, "diagrams");
const outDir = path.join(__dirname, "diagrams", "png");
const htmlPath = path.join(__dirname, "prabodh-er-diagrams.html");
const pdfPath = path.join(__dirname, "prabodh-er-diagrams.pdf");

const sections = [
  {
    n: 1,
    title: "High-level domain map",
    file: "01-domain-map.mmd",
    note: "Six bounded contexts: identity, teams, problem statements, mentors, competition stages, and notifications.",
  },
  {
    n: 2,
    title: "Identity and users",
    file: "02-identity.mmd",
    note: "Roles: student, institute_mentor, industry_mentor, admin, student_expert. Auth uses password_hash + JWT (no external identity provider).",
  },
  {
    n: 3,
    title: "Teams and membership",
    file: "03-teams.mmd",
    note: "Teams identified by team_code. Invites tracked in team_members and mentor_invites; email via Resend.",
  },
  {
    n: 4,
    title: "Problem statements and ideas",
    file: "04-problem-statements.mmd",
    note: "Teams rank PS choices; mentors approve. idea_submissions hold draft/locked ideas per team.",
  },
  {
    n: 5,
    title: "Mentor allocation",
    file: "05-mentors.mmd",
    note: "mentor_assignments is the audit trail; faculty and industry mentor slots are denormalized on teams.",
  },
  {
    n: 6,
    title: "Stages, deliverables, and evaluation",
    file: "06-stages.mmd",
    note: "Team × stage progress via team_stage_status, deliverables, evaluations, and published stage_results.",
  },
  {
    n: 7,
    title: "Notifications and broadcasts",
    file: "07-notifications.mmd",
    note: "In-app notifications plus notification_log for email delivery tracking.",
  },
  {
    n: 8,
    title: "External systems",
    file: "08-external.mmd",
    note: "Not stored in PostgreSQL: Redis (OTP, queues), Resend (email), S3/R2 (files).",
  },
];

fs.mkdirSync(outDir, { recursive: true });

const mmdc = path.join(__dirname, "node_modules", ".bin", "mmdc.cmd");
const mmdcBin = fs.existsSync(mmdc) ? `"${mmdc}"` : "npx --yes @mermaid-js/mermaid-cli";

for (const s of sections) {
  const input = path.join(diagramsDir, s.file);
  const output = path.join(outDir, s.file.replace(".mmd", ".png"));
  const cmd = `${mmdcBin} -i "${input}" -o "${output}" -b white --size 1600 -s 2 -t neutral`;
  console.log("Rendering", s.file);
  execSync(cmd, { stdio: "inherit", cwd: __dirname, shell: true });
  if (!fs.existsSync(output)) throw new Error(`Failed to render ${s.file}`);
}

const tablesHtml = `
<table>
  <thead><tr><th>#</th><th>Table</th><th>Purpose</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>users</td><td>Accounts, roles, credentials</td></tr>
    <tr><td>2</td><td>teams</td><td>SIH squads</td></tr>
    <tr><td>3</td><td>team_members</td><td>Roster and email invites</td></tr>
    <tr><td>4</td><td>industrial_mentors</td><td>Industry mentor profiles</td></tr>
    <tr><td>5</td><td>problem_statements</td><td>Official PS catalog</td></tr>
    <tr><td>6</td><td>team_ps_preferences</td><td>Ranked PS choices</td></tr>
    <tr><td>7</td><td>idea_submissions</td><td>Team idea drafts</td></tr>
    <tr><td>8</td><td>join_requests</td><td>Student join requests</td></tr>
    <tr><td>9</td><td>mentor_assignments</td><td>Mentor allocation history</td></tr>
    <tr><td>10</td><td>mentor_invites</td><td>Team to mentor invites</td></tr>
    <tr><td>11</td><td>stages</td><td>Competition milestones</td></tr>
    <tr><td>12</td><td>rubrics</td><td>Scoring criteria</td></tr>
    <tr><td>13</td><td>deliverables</td><td>Stage uploads</td></tr>
    <tr><td>14</td><td>team_stage_status</td><td>Per-team stage progress</td></tr>
    <tr><td>15</td><td>evaluations</td><td>Mentor scores</td></tr>
    <tr><td>16</td><td>stage_results</td><td>Published results</td></tr>
    <tr><td>17</td><td>comments</td><td>Team threads</td></tr>
    <tr><td>18</td><td>notifications</td><td>In-app alerts</td></tr>
    <tr><td>19</td><td>notification_log</td><td>Email delivery log</td></tr>
    <tr><td>20</td><td>broadcasts</td><td>Admin broadcasts</td></tr>
    <tr><td>21</td><td>audit_log</td><td>Change history</td></tr>
    <tr><td>22</td><td>export_jobs</td><td>Data exports</td></tr>
    <tr><td>23</td><td>platform_settings</td><td>Runtime config</td></tr>
    <tr><td>24</td><td>user_import_batches</td><td>Bulk import batches</td></tr>
    <tr><td>25</td><td>user_import_rows</td><td>Import batch rows</td></tr>
  </tbody>
</table>`;

const relHtml = `
<table>
  <thead><tr><th>From</th><th>To</th><th>Card.</th><th>FK / notes</th></tr></thead>
  <tbody>
    <tr><td>User</td><td>Team</td><td>1:N</td><td>leader_user_id</td></tr>
    <tr><td>User</td><td>Team</td><td>0:1</td><td>faculty_mentor_id</td></tr>
    <tr><td>IndustrialMentor</td><td>Team</td><td>0:1</td><td>industrial_mentor_id</td></tr>
    <tr><td>Team</td><td>TeamMember</td><td>1:N</td><td>unique team_id + invited_email</td></tr>
    <tr><td>Team</td><td>ProblemStatement</td><td>N:1</td><td>ps_id optional</td></tr>
    <tr><td>Team</td><td>Stage</td><td>N:M</td><td>via junction tables</td></tr>
    <tr><td>MentorAssignment</td><td>MentorAssignment</td><td>chain</td><td>reassigned_from_id</td></tr>
  </tbody>
</table>`;

const diagramBlocks = sections
  .map((s) => {
    const img = `diagrams/png/${s.file.replace(".mmd", ".png")}`;
    const page = s.n > 1 ? ' class="page"' : "";
    return `
    <section${page}>
      <h2>${s.n}. ${s.title}</h2>
      <p class="note">${s.note}</p>
      <figure><img src="${img}" alt="${s.title}" /></figure>
    </section>`;
  })
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prabodh ER Diagrams</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Calibri, system-ui, sans-serif;
      color: #1a1a1a;
      margin: 0;
      padding: 20px 28px;
      background: #fff;
    }
    h1 { color: #5B2E10; font-size: 26px; margin: 0 0 6px; }
    h2 { color: #5B2E10; font-size: 18px; margin: 0 0 8px; border-bottom: 2px solid #D96B27; padding-bottom: 4px; }
    .meta { color: #555; font-size: 13px; margin-bottom: 18px; }
    .note { font-size: 12px; color: #444; margin: 0 0 12px; line-height: 1.4; }
    section { margin-bottom: 24px; }
    section.page { page-break-before: always; }
    figure { margin: 0; text-align: center; }
    img { max-width: 100%; height: auto; border: 1px solid #e8dfd6; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; }
    th { background: #f5f0eb; }
    .callout {
      background: #fdf8f4;
      border-left: 4px solid #D96B27;
      padding: 10px 14px;
      margin: 12px 0 20px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>Prabodh — Entity Relationship Diagrams</h1>
  <p class="meta">Source: backend/prisma/schema.prisma · 25 PostgreSQL tables · JWT auth (no Clerk) · ${new Date().toISOString().slice(0, 10)}</p>
  <div class="callout">
    <strong>Schema note:</strong> Removed clerk_user_id, clerk_org_id, and clerk_invitation_id.
    Teams use <code>team_code</code>; users authenticate with email + password/OTP and app-issued JWT.
  </div>
  ${diagramBlocks}
  <section class="page">
    <h2>9. All tables (25)</h2>
    ${tablesHtml}
    <h2 style="margin-top:20px">10. Core relationships</h2>
    ${relHtml}
  </section>
</body>
</html>`;

fs.writeFileSync(htmlPath, html, "utf8");
console.log("Wrote HTML", htmlPath);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 60_000 });
await page.pdf({
  path: pdfPath,
  format: "A4",
  landscape: true,
  printBackground: true,
  margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
});
await browser.close();
console.log("Wrote PDF", pdfPath);
