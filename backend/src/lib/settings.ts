import { PrismaService } from './prisma.service';
import { DEFAULT_SETTINGS } from '../domain/rules';

export async function getSettingNumber(prisma: PrismaService, key: keyof typeof DEFAULT_SETTINGS): Promise<number> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (!row) return DEFAULT_SETTINGS[key];
  const n = Number(row.value);
  return Number.isFinite(n) ? n : DEFAULT_SETTINGS[key];
}

export async function upsertSetting(prisma: PrismaService, key: string, value: string) {
  return prisma.platformSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}