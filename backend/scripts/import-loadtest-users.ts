/**
 * Import load-test users from the Testing/seed-users.csv into the target DB.
 *
 * Mirrors prisma/seed.ts + IdentityService.bulkCreate conventions:
 *  - passwords are scrypt-hashed via src/lib/password (login works with default password)
 *  - existing users are left untouched when they already exist
 *  - industry mentors get an IndustrialMentor profile row
 *
 * Run (from backend/):
 *   DATABASE_URL=<prod-url> npx tsx scripts/import-loadtest-users.ts [path-to-csv]
 */
import { PrismaClient, PlatformRole } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Prabodh@123';
const INSTITUTE = 'MIT Art, Design and Technology University';

type CsvRow = { email: string; password: string; role: string };

function parseCsv(csvPath: string): CsvRow[] {
  const text = readFileSync(csvPath, 'utf8').trim();
  const lines = text.split(/\r?\n/).filter(Boolean).slice(1);
  return lines.map((line) => {
    const [email, password, role] = line.split(',').map((s) => s.trim());
    return { email, password, role };
  });
}

function fullNameFromEmail(email: string) {
  const local = email.split('@')[0];
  return local
    .split(/[._-]/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ');
}

function roleFor(row: CsvRow): PlatformRole {
  const r = row.role.toLowerCase();
  if (r === 'admin') return PlatformRole.admin;
  if (r === 'student') return PlatformRole.student;
  if (r === 'mentor') {
    const domain = row.email.toLowerCase();
    return domain.endsWith('partner.com') || domain.endsWith('partnertech.in')
      ? PlatformRole.industry_mentor
      : PlatformRole.institute_mentor;
  }
  return PlatformRole.student;
}

async function main() {
  const csvPath = process.argv[2] ?? resolve(process.cwd(), '../Testing/seed-users.csv');
  const rows = parseCsv(csvPath);
  console.log(`Importing ${rows.length} users from ${csvPath}\n`);

  for (const row of rows) {
    const email = row.email.toLowerCase();
    const password = row.password || DEFAULT_PASSWORD;
    const targetRole = roleFor(row);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.platformRole !== targetRole) {
        console.log(`SKIPPED ${email}: exists as ${existing.platformRole}, CSV says ${targetRole}`);
        continue;
      }
      if (existing.platformRole === PlatformRole.admin) {
        console.log(`KEPT ${email}: admin left untouched (role=${existing.platformRole})`);
        continue;
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: fullNameFromEmail(email),
          institute: INSTITUTE,
          isActive: true,
          passwordHash: hashPassword(password),
        },
      });
      console.log(`UPDATED ${email}: role=${existing.platformRole}`);
    } else {
      const user = await prisma.user.create({
        data: {
          email,
          fullName: fullNameFromEmail(email),
          platformRole: targetRole,
          institute: INSTITUTE,
          department: targetRole === PlatformRole.student ? 'CSE' : undefined,
          isActive: true,
          passwordHash: hashPassword(password),
        },
      });
      if (targetRole === PlatformRole.industry_mentor) {
        await prisma.industrialMentor.upsert({
          where: { userId: user.id },
          update: { isActive: true },
          create: {
            userId: user.id,
            fullName: user.fullName,
            email: user.email,
            companyName: 'Partner Systems',
            designation: 'Mentor',
            domainExpertise: [],
            isActive: true,
          },
        });
      }
      console.log(`CREATED ${email}: role=${targetRole}`);
    }
  }

  const emails = rows.map((r) => r.email.toLowerCase());
  const found = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, platformRole: true, isActive: true },
    orderBy: { email: 'asc' },
  });
  console.log(`\nVerified ${found.length}/${rows.length} rows in DB:`);
  for (const u of found) {
    console.log(`  ${u.email} -> ${u.platformRole} (active=${u.isActive})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });