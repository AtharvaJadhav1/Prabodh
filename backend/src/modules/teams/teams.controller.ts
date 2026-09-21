import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { parsePagination } from '../../common/pagination';
import { ZodPipe } from '../../common/zod.pipe';
import { assignIndustrialMentorSchema, createTeamSchema, inviteSchema, patchTeamSchema } from './schema';
import { TeamsService } from './service';

@Controller('teams')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  @Roles(PlatformRole.student)
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createTeamSchema)) body: unknown) {
    return this.teams.create(user, body as never);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: { page?: string; limit?: string }) {
    const { page, limit } = parsePagination(query);
    return this.teams.listForUser(user, page, limit);
  }

  @Get('current')
  @Roles(PlatformRole.student)
  current(@CurrentUser() user: AuthUser) {
    return this.teams.getCurrentForUser(user);
  }

  @Get('invites/my-invites')
  @Roles(PlatformRole.student)
  myInvites(@CurrentUser() user: AuthUser) {
    return this.teams.myPendingInvites(user);
  }

  @Post('invites/:inviteId/accept')
  @Roles(PlatformRole.student)
  acceptInvite(@CurrentUser() user: AuthUser, @Param('inviteId') inviteId: string) {
    return this.teams.acceptInvite(user, inviteId);
  }

  @Post('invites/:inviteId/decline')
  @Roles(PlatformRole.student)
  declineInvite(@CurrentUser() user: AuthUser, @Param('inviteId') inviteId: string) {
    return this.teams.declineInvite(user, inviteId);
  }

  @Get(':teamId/deliverables')
  deliverables(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.teams.listDeliverables(user, teamId);
  }

  @Get(':teamId/mentors')
  mentors(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.teams.mentorDetails(user, teamId);
  }

  @Post(':teamId/assign-industrial-mentor')
  @Put(':teamId/assign-industrial-mentor')
  @Roles(PlatformRole.admin)
  assignIndustrialMentor(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Body(new ZodPipe(assignIndustrialMentorSchema)) body: unknown,
  ) {
    const { industrialMentorId, industrial_mentor_id, userId } = body as {
      industrialMentorId?: string;
      industrial_mentor_id?: string;
      userId?: string;
    };
    return this.teams.assignIndustrialMentor(user, teamId, industrialMentorId ?? industrial_mentor_id, userId);
  }

  @Get(':teamId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Query('view') view?: string,
  ) {
    const mode = view === 'full' ? 'full' : 'dashboard';
    return this.teams.get(user, teamId, mode);
  }

  @Patch(':teamId')
  patch(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Body(new ZodPipe(patchTeamSchema)) body: unknown,
  ) {
    return this.teams.patch(user, teamId, body as never);
  }

  @Post(':teamId/invite')
  invite(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Body(new ZodPipe(inviteSchema)) body: unknown,
  ) {
    return this.teams.invite(user, teamId, body as never);
  }

  @Delete(':teamId/members/:memberId')
  @Roles(PlatformRole.student)
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teams.removeMember(user, teamId, memberId);
  }

  @Post(':teamId/invite/:memberId/revoke')
  revokeInvite(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teams.revokeInvite(user, teamId, memberId);
  }

  @Post(':teamId/lock')
  @Roles(PlatformRole.admin)
  lock(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.teams.lock(user, teamId);
  }

  @Post(':teamId/disqualify')
  @Roles(PlatformRole.admin)
  disqualify(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.teams.disqualify(user, teamId);
  }
}
