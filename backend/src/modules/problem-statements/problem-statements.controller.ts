import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { createIdeaSchema, createPsSchema, manualIdeaSchema, patchIdeaSchema, patchPsSchema } from './schema';
import { ProblemStatementsService } from './service';

@Controller()
@UseGuards(ClerkAuthGuard, RolesGuard)
export class ProblemStatementsController {
  constructor(private readonly service: ProblemStatementsService) {}

  @Get('problem-statements')
  list(
    @Query()
    query: { theme?: string; category?: string; organisation?: string; q?: string; page?: string; limit?: string },
  ) {
    return this.service.list(query);
  }

  @Post('problem-statements')
  @Roles(PlatformRole.admin)
  createPs(@Body(new ZodPipe(createPsSchema)) body: unknown) {
    return this.service.createPs(body as never);
  }

  @Patch('problem-statements/:id')
  @Roles(PlatformRole.admin)
  updatePs(@Param('id') id: string, @Body(new ZodPipe(patchPsSchema)) body: unknown) {
    return this.service.updatePs(id, body as never);
  }

  @Delete('problem-statements/:id')
  @Roles(PlatformRole.admin)
  deletePs(@Param('id') id: string) {
    return this.service.deletePs(id);
  }

  @Post('idea-submissions')
  @Roles(PlatformRole.student)
  createIdea(@CurrentUser() user: AuthUser, @Body(new ZodPipe(createIdeaSchema)) body: unknown) {
    return this.service.createIdea(user, body as never);
  }

  @Post('idea-submissions/manual')
  @Roles(PlatformRole.student)
  createManualIdea(@CurrentUser() user: AuthUser, @Body(new ZodPipe(manualIdeaSchema)) body: unknown) {
    return this.service.submitManualIdea(user, body as never);
  }

  @Patch('idea-submissions/:id')
  @Roles(PlatformRole.student)
  patchIdea(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(patchIdeaSchema)) body: unknown,
  ) {
    return this.service.patchIdea(user, id, body as never);
  }

  @Post('idea-submissions/:id/lock')
  @Roles(PlatformRole.student)
  lockIdea(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.lockIdea(user, id);
  }

  @Delete('idea-submissions/:id')
  @Roles(PlatformRole.student, PlatformRole.admin)
  abandonIdea(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.abandonIdea(user, id);
  }
}
