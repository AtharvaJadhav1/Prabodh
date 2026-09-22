/**
 * Import SIH'26 problem statements from the PBL repo CSV into the portal.
 *
 * Source file lives at the repo root:
 *   PS_with_description - Problem Statements.csv
 *
 * CSV layout:
 *   row 0 = stray blank line
 *   row 1 = header: Sr. No., PS Number, Organization, Problem Statement Title,
 *           description, Category, Submitted Idea Count(s), Theme
 *
 * Handles quoted fields with embedded newlines (MITCOM rows), collapses
 * whitespace, fixes common OCR artifacts (Al->AI, lnt->Int, lmage->Image, ...),
 * upserts keyed on the unique `code` (single batched INSERT ... ON CONFLICT),
 * and removes the old demo seed PS (SIH2026-*).
 *
 * Run from backend/:  npx tsx scripts/import-ps.ts [path/to/file.csv]
 */
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { join, resolve } from "path";
import { Prisma, PrismaClient, PsCategory } from "@prisma/client";

const prisma = new PrismaClient();

function loadEnv() {
  const p = join(process.cwd(), ".env");
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fixArtifacts(text: string): string {
  let t = text;
  t = t.replace(/(^|[^A-Za-z])Al-(?=[A-Z])/g, "$1AI-");
  t = t.replace(/Al(?= [A-Z])/g, "AI");
  t = t.replace(/lmage/g, "Image");
  t = t.replace(/lnt/g, "Int");
  t = t.replace(/Governmcnt/g, "Government");
  t = t.replace(/[Cc]ovigilance/g, "Vigilance");
  t = t.replace(/\uFFFD/g, "–");
  return clean(t);
}

function normalizeCategory(value: string): PsCategory | undefined {
  const v = value.trim().toLowerCase();
  if (v.startsWith("software")) return PsCategory.software;
  if (v.startsWith("hardware")) return PsCategory.hardware;
  return undefined;
}

async function removeDemoSeeds() {
  const demo = await prisma.problemStatement.findMany({
    where: { code: { startsWith: "SIH2026-" } },
    select: { id: true },
  });
  if (demo.length === 0) return 0;
  const ids = demo.map((d) => d.id);
  await prisma.team.updateMany({ where: { psId: { in: ids } }, data: { psId: null } });
  const ideas = await prisma.ideaSubmission.deleteMany({ where: { psId: { in: ids } } });
  const prefs = await prisma.teamPsPreference.deleteMany({ where: { psId: { in: ids } } });
  const removed = await prisma.problemStatement.deleteMany({ where: { id: { in: ids } } });
  return { removedCount: removed.count, orphanIdeas: ideas.count, orphanPrefs: prefs.count };
}

async function main() {
  loadEnv();

  const csvPath = resolve(process.cwd(), process.argv[2] ?? "../PS_with_description - Problem Statements.csv");
  const text = readFileSync(csvPath, "utf8");
  const rows = parseCsv(text);

  const headerIdx = rows.findIndex((r) => r.length > 0 && r.some((c) => /PS Number/i.test(c)));
  if (headerIdx < 0) throw new Error("Could not locate header row (expected a row containing 'PS Number').");

  const col = (name: string) =>
    rows[headerIdx].findIndex((h) => new RegExp(name, "i").test(h.trim()));

  const cCode = col("PS Number");
  const cTitle = col("Problem Statement Title");
  const cDescription = col("description");
  const cCategory = col("Category");
  const cOrganisation = col("Organization");
  const cTheme = col("Theme");
  if ([cCode, cTitle, cCategory, cOrganisation, cTheme].some((i) => i < 0)) {
    throw new Error("Header row is missing required columns (PS Number / Title / Category / Organization / Theme).");
  }

  const data = rows.slice(headerIdx + 1).filter((r) => r.length > 1 && r[cCode]?.trim());
  const skipped: Array<{ code: string; reason: string }> = [];
  const values: Array<Prisma.Sql> = [];

  for (const r of data) {
    const code = clean(r[cCode]);
    const title = fixArtifacts(r[cTitle] ?? "");
    const category = normalizeCategory(r[cCategory] ?? "");
    const organisation = fixArtifacts(r[cOrganisation] ?? "");
    const theme = fixArtifacts(r[cTheme] ?? "");
    const rawDesc = cDescription >= 0 ? r[cDescription] ?? "" : "";
    const description = fixArtifacts(rawDesc) || title;

    if (!title) {
      skipped.push({ code, reason: "empty title" });
      continue;
    }
    if (!category) {
      skipped.push({ code, reason: `bad category: ${r[cCategory]}` });
      continue;
    }
    if (!organisation || !theme) {
      skipped.push({ code, reason: "empty organisation/theme" });
      continue;
    }

    const now = new Date();
  values.push(
      Prisma.sql`(${randomUUID()}, ${code}, ${title}, ${theme}, CAST(${category} AS "PsCategory"), ${organisation}, ${description}, ${now}, ${now})`,
    );
  }

  const before = await prisma.problemStatement.count();

  if (values.length > 0) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "problem_statements" ("id", "code", "title", "theme", "category", "organisation", "description", "created_at", "updated_at")
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("code") DO UPDATE SET
        "title" = EXCLUDED."title",
        "theme" = EXCLUDED."theme",
        "category" = EXCLUDED."category",
        "organisation" = EXCLUDED."organisation",
        "description" = EXCLUDED."description",
        "updated_at" = EXCLUDED."updated_at"
    `);
  }

  const after = await prisma.problemStatement.count();
  const created = after - before;
  const updated = values.length - created;

  const demo = await removeDemoSeeds();

  console.log("Import complete", {
    source: csvPath,
    rowsInFile: data.length,
    created,
    updated,
    totalAfter: after,
    skipped: skipped.length,
    skippedDetails: skipped.slice(0, 20),
    demoSeedsRemoved: demo.removedCount,
    orphanSubmissionsCascaded: demo.orphanIdeas + demo.orphanPrefs,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });