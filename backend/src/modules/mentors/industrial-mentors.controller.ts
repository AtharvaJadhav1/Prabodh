import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { MentorsService } from './service';

@Controller('industrial-mentors')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class IndustrialMentorsController {
  constructor(private readonly mentors: MentorsService) {}

  @Get()
  @Roles(PlatformRole.institute_mentor, PlatformRole.admin)
  list(@Query('domain') domain?: string, @Query('q') q?: string) {
    return this.mentors.listIndustrialMentors({ domain, q });
  }
}