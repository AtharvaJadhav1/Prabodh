import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { DEFAULT_SETTINGS } from '../domain/rules';
import { TtlCache } from './ttl-cache';

type SettingsClient = Pick<PrismaService, 'platformSetting'> | Pick<Prisma.TransactionClient, 'platformSetting'>;

const settingsCache = new TtlCache<number>(30_000);

export async function getSettingNumber(prisma: SettingsClient, key: keyof typeof DEFAULT_SETTINGS): Promise<number> {
  const cached = settingsCache.get(key);
  if (cached !== undefined) return cached;
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (!row) {
    settingsCache.set(key, DEFAULT_SETTINGS[key]);
    return DEFAULT_SETTINGS[key];
  }
  const n = Number(row.value);
  const value = Number.isFinite(n) ? n : DEFAULT_SETTINGS[key];
  settingsCache.set(key, value);
  return value;
}

export async function upsertSetting(prisma: PrismaService, key: string, value: string) {
  settingsCache.delete(key);
  return prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}