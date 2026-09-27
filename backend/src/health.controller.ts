import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './lib/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  private lastDbOkAt = 0;
  private dbProbe: Promise<void> | null = null;

  @Get()
  async health() {
    // Collapse concurrent probe storms onto one SELECT every 2s (Artillery hits this hard).
    const now = Date.now();
    if (now - this.lastDbOkAt > 2000) {
      if (!this.dbProbe) {
        this.dbProbe = this.prisma
          .$queryRaw`SELECT 1`
          .then(() => {
            this.lastDbOkAt = Date.now();
          })
          .finally(() => {
            this.dbProbe = null;
          });
      }
      await this.dbProbe;
    }
    return { ok: true, service: 'sih-portal-backend' };
  }
}
