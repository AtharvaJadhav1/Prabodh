import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { createEvaluationSchema, publishSchema } from './schema';
import { EvaluationsService } from './service';

@Controller()
@UseGuards(ClerkAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Post('evaluations')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  submit(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createEvaluationSchema)) body: unknown) {
    return this.evaluations.submit(user, body as never);
  }

  @Get('stages/:stageId/results')
  @Roles(PlatformRole.admin, PlatformRole.institute_mentor, PlatformRole.industry_mentor)
  results(@Param('stageId') stageId: string) {
    return this.evaluations.results(stageId);
  }

  @Post('stages/:stageId/results/publish')
  @Roles(PlatformRole.admin)
  publish(
    @CurrentUser() user: AuthUser,
    @Param('stageId') stageId: string,
    @Body(new ZodPipe(publishSchema)) body: unknown,
  ) {
    return this.evaluations.publish(user, stageId, body as never);
  }

  @Get('teams/:teamId/my-results')
  myResults(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.evaluations.myResultsOr403(user, teamId);
  }
}
