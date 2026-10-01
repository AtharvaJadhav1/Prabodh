import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import {
  BatchesService,
  batchCreateSchema,
  batchLeadersSchema,
  batchTeamsSchema,
  batchUpdateSchema,
} from './batches.service';

/** Admin-only: batches group teams, each team in at most one batch. */
@Controller('admin/batches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(PlatformRole.admin)
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Get()
  list() {
    return this.batches.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.batches.get(id);
  }

  @Post()
  create(@CurrentUser() admin: AuthUser, @Body(new ZodPipe(batchCreateSchema)) body: unknown) {
    return this.batches.create(admin, body as never);
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(batchUpdateSchema)) body: unknown,
  ) {
    return this.batches.update(admin, id, body as never);
  }

  @Post(':id/teams')
  addTeams(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(batchTeamsSchema)) body: unknown,
  ) {
    return this.batches.addTeams(admin, id, (body as { teamIds: string[] }).teamIds);
  }

  @Post(':id/leaders')
  inviteLeaders(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(batchLeadersSchema)) body: unknown,
  ) {
    return this.batches.inviteLeaders(admin, id, body as never);
  }

  @Delete(':id/teams/:teamId')
  removeTeam(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Param('teamId') teamId: string) {
    return this.batches.removeTeam(admin, id, teamId);
  }

  @Delete(':id')
  remove(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    return this.batches.remove(admin, id);
  }
}
