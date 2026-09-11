import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { z } from 'zod';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { allocateSchema, autoAllocateSchema, mentorInviteSchema } from './schema';
import { MentorsService } from './service';

const reassignSchema = z.object({ mentorUserId: z.string().uuid() });

@Controller('mentors')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class MentorsController {
  constructor(private readonly mentors: MentorsService) {}

  @Get('faculty')
  listFaculty() {
    return this.mentors.listFaculty();
  }

  @Get('invites')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  myInvites(@CurrentUser() user: AuthUser) {
    return this.mentors.pendingInvitesForMentor(user);
  }

  @Post('invite')
  @Roles(PlatformRole.student, PlatformRole.admin)
  invite(@CurrentUser() user: AuthUser, @Body(new ZodPipe(mentorInviteSchema)) body: unknown) {
    return this.mentors.inviteFromLeader(user, body as never);
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
  @Roles(PlatformRole.student, PlatformRole.admin)
  revokeInvite(@CurrentUser() user: AuthUser, @Param('inviteId') inviteId: string) {
    return this.mentors.revokeInvite(user, inviteId);
  }

  @Post('allocate')
  @Roles(PlatformRole.admin)
  allocate(@CurrentUser() user: AuthUser, @Body(new ZodPipe(allocateSchema)) body: unknown) {
    return this.mentors.allocate(user, body as never);
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

  @Get('me/teams')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  myTeams(@CurrentUser() user: AuthUser) {
    return this.mentors.myTeams(user);
  }
}
