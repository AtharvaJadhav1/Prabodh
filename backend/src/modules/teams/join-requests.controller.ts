import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { TeamsService } from './service';

@Controller('teams')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class JoinRequestsController {
  constructor(private readonly teams: TeamsService) {}

  @Post(':teamId/join-requests')
  @Roles(PlatformRole.student)
  create(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
  ) {
    return this.teams.createJoinRequest(user, teamId);
  }

  @Get(':teamId/join-requests')
  list(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.teams.listJoinRequests(user, teamId);
  }

  @Patch(':requestId/accept')
  accept(@CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    return this.teams.acceptJoinRequest(user, requestId);
  }

  @Patch(':requestId/reject')
  reject(@CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    return this.teams.rejectJoinRequest(user, requestId);
  }
}