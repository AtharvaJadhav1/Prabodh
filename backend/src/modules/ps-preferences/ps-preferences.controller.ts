import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { submitPreferencesSchema } from './schema';
import { PsPreferencesService } from './service';

@Controller('teams/:teamId/ps-preferences')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class PsPreferencesController {
  constructor(private readonly service: PsPreferencesService) {}

  @Get()
  @Roles(PlatformRole.student, PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  list(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.service.list(user, teamId);
  }

  @Post()
  @Roles(PlatformRole.student)
  save(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Body(new ZodPipe(submitPreferencesSchema)) body: unknown,
  ) {
    return this.service.save(user, teamId, body as never);
  }

  @Post('submit')
  @Roles(PlatformRole.student)
  submit(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Body(new ZodPipe(submitPreferencesSchema)) body: unknown,
  ) {
    return this.service.submit(user, teamId, body as never);
  }

  @Post(':preferenceId/approve')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  approve(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Param('preferenceId') preferenceId: string,
  ) {
    return this.service.approve(user, teamId, preferenceId);
  }
}
