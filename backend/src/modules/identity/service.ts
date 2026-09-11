import { BadRequestException, Injectable } from '@nestjs/common';
import { InviteStatus, PlatformRole } from '@prisma/client';
import { getClerkClient } from '../../lib/clerk';
import { PrismaService } from '../../lib/prisma.service';
import { IdentityRepository } from './repository';

@Injectable()
export class IdentityService {
  constructor(
    private readonly repo: IdentityRepository,
    private readonly prisma: PrismaService,
  ) {}

  loginByEmail(email: string) {
    return this.repo.findByEmail(email.toLowerCase());
  }

  updateProfile(
    userId: string,
    body: { fullName?: string; phone?: string; department?: string; institute?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: body.fullName,
        phone: body.phone,
        department: body.department,
        institute: body.institute,
      },
    });
  }

  async handleClerkEvent(eventType: string, data: Record<string, unknown>) {
    if (eventType.startsWith('user.')) {
      return this.syncClerkUser(eventType, data);
    }
    if (
      eventType === 'organizationInvitation.accepted' ||
      eventType === 'organizationMembership.created'
    ) {
      return this.syncOrgMembership(data);
    }
    return { ignored: eventType };
  }

  async syncClerkUser(eventType: string, data: Record<string, unknown>) {
    const clerkUserId = String(data.id ?? '');
    if (!clerkUserId) return null;

    if (eventType === 'user.deleted') {
      await this.repo.deactivateByClerkId(clerkUserId);
      return { clerkUserId, deactivated: true };
    }

    const email = extractPrimaryEmail(data) ?? `${clerkUserId}@unknown.local`;
    const first = String((data.first_name as string) ?? '');
    const last = String((data.last_name as string) ?? '');
    const fullName = `${first} ${last}`.trim() || email;
    const meta = (data.public_metadata ?? {}) as Record<string, unknown>;
    const platformRole = parseRole(meta.role);

    const user = await this.repo.upsertFromClerk({
      clerkUserId,
      email,
      fullName,
      platformRole,
    });
    await this.acceptPendingInvitesForUser(user.id, email, clerkUserId);
    return user;
  }

  async syncOrgMembership(data: Record<string, unknown>) {
    const orgId = String(
      (data.organization as { id?: string } | undefined)?.id ?? data.organization_id ?? '',
    );
    const email = String(
      data.email_address ??
        (data.public_user_data as { identifier?: string } | undefined)?.identifier ??
        '',
    ).toLowerCase();
    const clerkUserId = String(
      data.user_id ?? (data.public_user_data as { user_id?: string } | undefined)?.user_id ?? '',
    );
    const invitationId = String(data.id ?? data.invitation_id ?? '');
    if (!orgId) return { skipped: true };

    const team = await this.prisma.team.findUnique({ where: { clerkOrgId: orgId } });
    if (!team) return { skipped: 'unknown_org' };

    const user = clerkUserId
      ? await this.prisma.user.findUnique({ where: { clerkUserId } })
      : email
        ? await this.prisma.user.findUnique({ where: { email } })
        : null;

    if (invitationId) {
      await this.prisma.teamMember.updateMany({
        where: { clerkInvitationId: invitationId },
        data: {
          inviteStatus: InviteStatus.accepted,
          userId: user?.id,
          joinedAt: new Date(),
        },
      });
    }
    if (email) {
      await this.prisma.teamMember.updateMany({
        where: { teamId: team.id, invitedEmail: email, inviteStatus: InviteStatus.pending },
        data: {
          inviteStatus: InviteStatus.accepted,
          userId: user?.id,
          joinedAt: new Date(),
        },
      });
    }
    return { teamId: team.id, email, accepted: true };
  }

  private async acceptPendingInvitesForUser(userId: string, email: string, clerkUserId: string) {
    await this.prisma.teamMember.updateMany({
      where: { invitedEmail: email, inviteStatus: InviteStatus.pending },
      data: { inviteStatus: InviteStatus.accepted, userId, joinedAt: new Date() },
    });
    void clerkUserId;
  }

  async bulkCreate(rows: Array<{
    email: string;
    fullName: string;
    platformRole: PlatformRole;
    institute?: string;
    department?: string;
  }>) {
    const clerk = getClerkClient();
    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const row of rows) {
      try {
        let clerkUserId = `pending:${row.email}`;
        if (clerk) {
          const created = await clerk.users.createUser({
            emailAddress: [row.email],
            firstName: row.fullName.split(' ')[0],
            lastName: row.fullName.split(' ').slice(1).join(' ') || undefined,
            publicMetadata: { role: row.platformRole },
            skipPasswordRequirement: true,
          });
          clerkUserId = created.id;
        }
        await this.repo.upsertFromClerk({
          clerkUserId,
          email: row.email.toLowerCase(),
          fullName: row.fullName,
          platformRole: row.platformRole,
          institute: row.institute,
          department: row.department,
        });
        results.push({ email: row.email, status: 'created' });
      } catch (err) {
        results.push({
          email: row.email,
          status: 'failed',
          error: err instanceof Error ? err.message : 'unknown',
        });
      }
    }
    return results;
  }
}

function parseRole(role: unknown): PlatformRole {
  if (role === 'admin' || role === 'institute_mentor' || role === 'industry_mentor' || role === 'student') {
    return role;
  }
  return 'student';
}

function extractPrimaryEmail(data: Record<string, unknown>): string | null {
  const addresses = data.email_addresses as Array<{ id: string; email_address: string }> | undefined;
  const primaryId = data.primary_email_address_id as string | undefined;
  if (!addresses?.length) return null;
  const primary = addresses.find((a) => a.id === primaryId) ?? addresses[0];
  return primary.email_address.toLowerCase();
}

export function parseCsvUsers(csv: string) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) throw new BadRequestException('CSV needs a header and at least one row');
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf('email');
  const nameIdx = header.indexOf('full_name') >= 0 ? header.indexOf('full_name') : header.indexOf('name');
  const roleIdx = header.indexOf('role');
  const instIdx = header.indexOf('institute');
  const deptIdx = header.indexOf('department');
  if (emailIdx < 0 || nameIdx < 0 || roleIdx < 0) {
    throw new BadRequestException('CSV must include email, full_name, role columns');
  }
  return lines.slice(1).filter((line) => line.trim()).map((line) => {
    const cols = line.split(',').map((c) => c.trim());
    const role = parseRole(cols[roleIdx]);
    return {
      email: cols[emailIdx],
      fullName: cols[nameIdx],
      platformRole: role,
      institute: instIdx >= 0 ? cols[instIdx] : undefined,
      department: deptIdx >= 0 ? cols[deptIdx] : undefined,
    };
  });
}
