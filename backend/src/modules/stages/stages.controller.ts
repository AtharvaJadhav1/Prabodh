import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { createRubricSchema, createStageSchema, deliverableSchema, presignSchema, statusPatchSchema } from './schema';
import { StagesService } from './service';

@Controller()
@UseGuards(ClerkAuthGuard, RolesGuard)
export class StagesController {
  constructor(private readonly stages: StagesService) {}

  @Get('stages')
  list() {
    return this.stages.list();
  }

  @Post('stages')
  @Roles(PlatformRole.admin)
  create(@Body(new ZodPipe(createStageSchema)) body: unknown) {
    return this.stages.create(body as never);
  }

  @Patch('stages/:stageId')
  @Roles(PlatformRole.admin)
  update(@Param('stageId') stageId: string, @Body(new ZodPipe(createStageSchema.partial())) body: unknown) {
    return this.stages.update(stageId, body as never);
  }

  @Delete('stages/:stageId')
  @Roles(PlatformRole.admin)
  deactivate(@Param('stageId') stageId: string) {
    return this.stages.deactivate(stageId);
  }

  @Post('stages/:stageId/rubrics')
  @Roles(PlatformRole.admin)
  addRubric(@Param('stageId') stageId: string, @Body(new ZodPipe(createRubricSchema)) body: unknown) {
    return this.stages.addRubric(stageId, body as never);
  }

  @Post('stages/:stageId/deliverables/presign')
  presign(
    @CurrentUser() user: AuthUser,
    @Param('stageId') stageId: string,
    @Body(new ZodPipe(presignSchema)) body: unknown,
  ) {
    return this.stages.presign(user, stageId, body as never);
  }

  @Post('stages/:stageId/deliverables')
  submit(
    @CurrentUser() user: AuthUser,
    @Param('stageId') stageId: string,
    @Body(new ZodPipe(deliverableSchema)) body: unknown,
  ) {
    return this.stages.submitDeliverable(user, stageId, body as never);
  }

  @Get('teams/:teamId/status-tracker')
  tracker(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.stages.statusTracker(user, teamId);
  }

  @Patch('teams/:teamId/status-tracker/:stageId')
  @Roles(PlatformRole.institute_mentor, PlatformRole.industry_mentor, PlatformRole.admin)
  patchStatus(
    @CurrentUser() user: AuthUser,
    @Param('teamId') teamId: string,
    @Param('stageId') stageId: string,
    @Body(new ZodPipe(statusPatchSchema)) body: unknown,
  ) {
    return this.stages.patchStatus(user, teamId, stageId, body as never);
  }
}
