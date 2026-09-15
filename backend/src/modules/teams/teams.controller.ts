import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { parsePagination } from '../../common/pagination';
import { ZodPipe } from '../../common/zod.pipe';
import { createTeamSchema, inviteSchema, patchTeamSchema } from './schema';
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

  @Get(':teamId/deliverables')
  deliverables(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.teams.listDeliverables(user, teamId);
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
