/**
 * Replace all problem statements with SIH 2026 PS extracted from SIH_2026_All_PS.pdf.
 *
 * Source JSON (generated from the PDF):
 *   backend/data/sih2026-problem-statements.json
 *
 * Run from backend/:
 *   npx tsx scripts/import-sih2026-pdf-ps.ts
 */
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Prisma, PrismaClient, PsCategory } from '@prisma/client';

const prisma = new PrismaClient();

function loadEnv() {
  const p = join(process.cwd(), '.env');
  try {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
      }
    }
  } catch {
    /* env already provided */
  }
}

type PsRow = {
  code: string;
  title: string;
  organisation: string;
  category: 'software' | 'hardware';
  theme: string;
  description: string;
};

async function clearAllProblemStatements() {
  const all = await prisma.problemStatement.findMany({ select: { id: true, code: true } });
  if (!all.length) return { removed: 0, codes: [] as string[] };

  const ids = all.map((p) => p.id);
  await prisma.team.updateMany({ where: { psId: { in: ids } }, data: { psId: null } });
  await prisma.ideaSubmission.deleteMany({ where: { psId: { in: ids } } });
  await prisma.teamPsPreference.deleteMany({ where: { psId: { in: ids } } });
  const removed = await prisma.problemStatement.deleteMany({ where: { id: { in: ids } } });
  return { removed: removed.count, codes: all.map((p) => p.code) };
}

async function main() {
  loadEnv();

  const jsonPath = join(process.cwd(), 'data', 'sih2026-problem-statements.json');
  const rows = JSON.parse(readFileSync(jsonPath, 'utf8')) as PsRow[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No problem statements in ${jsonPath}`);
  }

  const before = await prisma.problemStatement.count();
  console.log('[import-ps] existing count=', before);

  const cleared = await clearAllProblemStatements();
  console.log('[import-ps] cleared=', cleared.removed);

  const values: Prisma.Sql[] = [];
  const skipped: Array<{ code: string; reason: string }> = [];

  for (const r of rows) {
    const code = r.code?.trim();
    const title = r.title?.trim();
    const organisation = r.organisation?.trim() || 'AICTE';
    const theme = r.theme?.trim() || 'Miscellaneous';
    const description = r.description?.trim() || title;
    const category =
      r.category === 'software'
        ? PsCategory.software
        : r.category === 'hardware'
          ? PsCategory.hardware
          : undefined;

    if (!code || !title || !category) {
      skipped.push({ code: code || '?', reason: 'missing code/title/category' });
      continue;
    }

    const now = new Date();
    values.push(
      Prisma.sql`(${randomUUID()}, ${code}, ${title}, ${theme}, CAST(${category} AS "PsCategory"), ${organisation}, ${description}, ${now}, ${now})`,
    );
  }

  // Insert in chunks to avoid oversized SQL packets.
  const CHUNK = 40;
  let inserted = 0;
  for (let i = 0; i < values.length; i += CHUNK) {
    const chunk = values.slice(i, i + CHUNK);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "problem_statements" ("id", "code", "title", "theme", "category", "organisation", "description", "created_at", "updated_at")
      VALUES ${Prisma.join(chunk)}
      ON CONFLICT ("code") DO UPDATE SET
        "title" = EXCLUDED."title",
        "theme" = EXCLUDED."theme",
        "category" = EXCLUDED."category",
        "organisation" = EXCLUDED."organisation",
        "description" = EXCLUDED."description",
        "updated_at" = EXCLUDED."updated_at"
    `);
    inserted += chunk.length;
    console.log(`[import-ps] upserted ${inserted}/${values.length}`);
  }

  const after = await prisma.problemStatement.count();
  const byCat = await prisma.problemStatement.groupBy({
    by: ['category'],
    _count: true,
  });

  console.log(
    JSON.stringify(
      {
        source: jsonPath,
        cleared: cleared.removed,
        rowsInFile: rows.length,
        upserted: values.length,
        skipped: skipped.length,
        skippedDetails: skipped.slice(0, 20),
        totalAfter: after,
        byCategory: byCat,
        sample: await prisma.problemStatement.findMany({
          take: 3,
          orderBy: { code: 'asc' },
          select: { code: true, title: true, category: true, theme: true, organisation: true },
        }),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error('[import-ps] failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
