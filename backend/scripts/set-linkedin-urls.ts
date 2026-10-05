/**
 * Bulk-set mentors' LinkedIn links from a CSV, so students see the LinkedIn icon beside their names.
 *
 *   npx tsx scripts/set-linkedin-urls.ts <file.csv>                    # preview only (writes nothing)
 *   npx tsx scripts/set-linkedin-urls.ts <file.csv> --apply            # write links to empty accounts
 *   npx tsx scripts/set-linkedin-urls.ts <file.csv> --apply --overwrite  # also replace links already set
 *
 * CSV columns: email, linkedinUrl (a `name` column is allowed and ignored). Accounts are matched by email,
 * case-insensitively. Only `users.linkedin_url` is touched; nothing is created or deleted.
 * It uses DATABASE_URL from backend/.env, so check which database that is before using --apply.
 */
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

/** A safe, storable link: http(s) only, within the column limit used by the API. */
export function cleanLinkedinUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v || v.length > 300) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v.replace(/^\/\//, '')}`;
  return /^https?:\/\//i.test(withScheme) ? withScheme : null;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const apply = args.includes('--apply');
  const overwrite = args.includes('--overwrite');
  if (!file) {
    console.error('Usage: npx tsx scripts/set-linkedin-urls.ts <file.csv> [--apply] [--overwrite]');
    process.exit(1);
  }

  const [header, ...body] = parseCsv(readFileSync(file, 'utf-8').replace(/^﻿/, ''));
  const cols = header.map((h) => h.trim().toLowerCase());
  const emailAt = cols.indexOf('email');
  const urlAt = cols.findIndex((h) => h === 'linkedinurl' || h === 'linkedin');
  if (emailAt < 0 || urlAt < 0) {
    console.error('The CSV needs "email" and "linkedinUrl" columns.');
    process.exit(1);
  }

  const dbHost = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').host;
    } catch {
      return '(DATABASE_URL not set)';
    }
  })();
  console.log(`Database: ${dbHost}`);
  console.log(apply ? `Mode: APPLY${overwrite ? ' (overwrite)' : ''}` : 'Mode: preview only (add --apply to write)');
  console.log('');

  const prisma = new PrismaClient();
  const counts = { updated: 0, same: 0, kept: 0, missing: 0, invalid: 0 };
  try {
    for (const r of body) {
      const email = (r[emailAt] ?? '').trim().toLowerCase();
      const url = cleanLinkedinUrl(r[urlAt] ?? '');
      if (!email) continue;
      if (!url) {
        counts.invalid++;
        console.log(`  invalid link   ${email}`);
        continue;
      }
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, linkedinUrl: true },
      });
      if (!user) {
        counts.missing++;
        console.log(`  no account     ${email}`);
        continue;
      }
      if (user.linkedinUrl === url) {
        counts.same++;
        continue;
      }
      if (user.linkedinUrl && !overwrite) {
        counts.kept++;
        console.log(`  already set    ${email} (kept; use --overwrite to replace)`);
        continue;
      }
      if (apply) await prisma.user.update({ where: { id: user.id }, data: { linkedinUrl: url } });
      counts.updated++;
      console.log(`  ${apply ? 'updated' : 'would update'}  ${email}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('');
  console.log(
    `${apply ? 'Updated' : 'Would update'}: ${counts.updated} | already identical: ${counts.same} | ` +
      `kept existing: ${counts.kept} | no account: ${counts.missing} | invalid link: ${counts.invalid}`,
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
