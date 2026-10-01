import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../../common/auth.types';
import { CurrentUser } from '../../common/current-user.decorator';
import { PlatformRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { MentorsService } from './service';

@Controller('industrial-mentors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IndustrialMentorsController {
  constructor(private readonly mentors: MentorsService) {}

  @Get()
  @Roles(PlatformRole.institute_mentor, PlatformRole.admin)
  list(
    @CurrentUser() user: AuthUser,
    @Query('domain') domain?: string,
    @Query('q') q?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.mentors.listIndustrialMentors({ domain, q, teamId }, user);
  }
}