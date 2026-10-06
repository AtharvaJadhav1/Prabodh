/**
 * One-time: encrypt direct messages that were saved before CHAT_ENCRYPTION_KEY was set.
 *
 *   npx tsx scripts/encrypt-existing-messages.ts            # preview only (writes nothing)
 *   npx tsx scripts/encrypt-existing-messages.ts --apply    # encrypt the plain-text messages
 *
 * Needs CHAT_ENCRYPTION_KEY in the environment (backend/.env or exported). Safe to re-run: messages that are
 * already encrypted are skipped, and each message is encrypted bound to its own conversation and sender.
 * It only changes direct_messages.body; nothing is created or deleted. Take a database backup first.
 */
import { PrismaClient } from '@prisma/client';
import { dmAad, encryptText, isEncrypted, loadKeyRing } from '../src/lib/message-crypto';

async function main() {
  const apply = process.argv.includes('--apply');
  const ring = loadKeyRing();
  if (!ring.current) {
    console.error('CHAT_ENCRYPTION_KEY is not set. Set it first, otherwise nothing would be encrypted.');
    process.exit(1);
  }
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').host;
    } catch {
      return '(DATABASE_URL not set)';
    }
  })();
  console.log(`Database: ${host}`);
  console.log(apply ? 'Mode: APPLY' : 'Mode: preview only (add --apply to write)');

  const prisma = new PrismaClient();
  let scanned = 0;
  let toEncrypt = 0;
  let already = 0;
  try {
    const batch = 500;
    let cursor: string | undefined;
    for (;;) {
      const rows = await prisma.directMessage.findMany({
        take: batch,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        select: { id: true, pairKey: true, senderId: true, body: true },
      });
      if (!rows.length) break;
      for (const r of rows) {
        scanned++;
        if (isEncrypted(r.body)) {
          already++;
          continue;
        }
        toEncrypt++;
        if (apply) {
          await prisma.directMessage.update({
            where: { id: r.id },
            data: { body: encryptText(r.body, dmAad(r.pairKey, r.senderId), ring) },
          });
        }
      }
      cursor = rows[rows.length - 1].id;
    }
  } finally {
    await prisma.$disconnect();
  }
  console.log(
    `\nScanned ${scanned} | already encrypted ${already} | ${apply ? 'encrypted now' : 'would encrypt'} ${toEncrypt}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
