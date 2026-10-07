import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { parseMentorTypeQuery } from '../../lib/mentor-rules';
import {
  allocateSchema,
  assignInstituteMentorSchema,
  auditLogQuerySchema,
  autoAllocateSchema,
  mentorInviteSchema,
  reassignSchema,
} from './schema';
import { MentorsService } from './service';

@Controller('mentors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MentorsController {
  constructor(private readonly mentors: MentorsService) {}

  @Get('faculty')
  listFaculty() {
    return this.mentors.listFaculty();
  }

  @Get('industry')
  listIndustryDirectory(@Query('domain') domain?: string, @Query('q') q?: string) {
    return this.mentors.listIndustryDirectory({ domain, q });
  }

  @Get('invites')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  myInvites(
    @CurrentUser() user: AuthUser,
    @Query('history') history?: string,
    @Query('mentorType') mentorType?: string,
  ) {
    return this.mentors.pendingInvitesForMentor(
      user,
      history === '1' || history === 'true',
      parseMentorTypeQuery(mentorType),
    );
  }

  @Post('invite')
  @Roles(PlatformRole.student, PlatformRole.institute_mentor, PlatformRole.admin)
  invite(@CurrentUser() user: AuthUser, @Body(new ZodPipe(mentorInviteSchema)) body: unknown) {
    return this.mentors.inviteFromLeader(user, body as z.infer<typeof mentorInviteSchema>);
  }

  @Post('invites/:inviteId/accept')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  acceptInvite(@CurrentUser() user: AuthUser, @Param('inviteId') inviteId: string) {
    return this.mentors.respondToInvite(user, inviteId, true);
  }

  @Post('invites/:inviteId/decline')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  declineInvite(@CurrentUser() user: AuthUser, @Param('inviteId') inviteId: string) {
    return this.mentors.respondToInvite(user, inviteId, false);
  }

  @Post('invites/:inviteId/revoke')
  @Roles(PlatformRole.student, PlatformRole.institute_mentor, PlatformRole.admin)
  revokeInvite(@CurrentUser() user: AuthUser, @Param('inviteId') inviteId: string) {
    return this.mentors.revokeInvite(user, inviteId);
  }

  @Post('allocate')
  @Roles(PlatformRole.admin)
  allocate(@CurrentUser() user: AuthUser, @Body(new ZodPipe(allocateSchema)) body: unknown) {
    return this.mentors.allocate(user, body as z.infer<typeof allocateSchema>);
  }

  @Post('assign-institute')
  @Roles(PlatformRole.admin)
  assignInstituteMentor(@CurrentUser() user: AuthUser, @Body(new ZodPipe(assignInstituteMentorSchema)) body: unknown) {
    const parsed = body as z.infer<typeof assignInstituteMentorSchema>;
    return this.mentors.assignInstituteMentor(user, parsed.teamId, parsed.mentorUserId);
  }

  @Post('auto-allocate')
  @Roles(PlatformRole.admin)
  autoAllocate(@CurrentUser() user: AuthUser, @Body(new ZodPipe(autoAllocateSchema)) body: unknown) {
    const parsed = body as z.infer<typeof autoAllocateSchema>;
    return this.mentors.autoAllocate(user, parsed.mentorType);
  }

  @Post(':assignmentId/reassign')
  @Roles(PlatformRole.admin)
  reassign(
    @CurrentUser() user: AuthUser,
    @Param('assignmentId') assignmentId: string,
    @Body(new ZodPipe(reassignSchema)) body: unknown,
  ) {
    return this.mentors.reassign(user, assignmentId, (body as { mentorUserId: string }).mentorUserId);
  }

  @Post(':assignmentId/unassign')
  @Roles(PlatformRole.admin)
  unassign(@CurrentUser() user: AuthUser, @Param('assignmentId') assignmentId: string) {
    return this.mentors.unassign(user, assignmentId);
  }

  @Get('me/audit-log')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor)
  // Validated here (zod): bad `hours` / `category` / `teamId` is a 400, not a 500.
  // Dual-role accounts must pass ?mentorType= so data is scoped to the workspace they are in.
  myAuditLog(@CurrentUser() user: AuthUser, @Query(new ZodPipe(auditLogQuerySchema)) query: unknown) {
    const parsed = query as z.infer<typeof auditLogQuerySchema>;
    return this.mentors.teamAuditLog(user, { ...parsed, mentorType: parseMentorTypeQuery(parsed.mentorType) });
  }

  @Get('me/teams')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  myTeams(@CurrentUser() user: AuthUser, @Query('mentorType') mentorType?: string) {
    return this.mentors.myTeams(user, parseMentorTypeQuery(mentorType));
  }
}
