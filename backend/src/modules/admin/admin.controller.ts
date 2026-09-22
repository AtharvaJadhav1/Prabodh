import { Body, Controller, Get, Param, Patch, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { AuthUser } from '../../common/auth.types';
import { ClerkAuthGuard } from '../../common/clerk-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { adminInviteUserSchema, exportSchema, settingsSchema } from './schema';
import { AdminService } from './service';
import { StagesService } from '../stages/service';

@Controller('admin')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(PlatformRole.admin)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly stages: StagesService,
  ) {}

  @Get('bootstrap')
  async bootstrap() {
    const [dashboard, teams, mentors, stages, users] = await Promise.all([
      this.admin.dashboard(),
      this.admin.listTeams({ page: '1', limit: '50' }),
      this.admin.listMentors(),
      this.stages.list(),
      this.admin.listUsers(),
    ]);
    return { dashboard, teams, mentors, stages, users };
  }

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  users(@Query('role') role?: string) {
    return this.admin.listUsers(role);
  }

  @Get('mentors')
  mentors() {
    return this.admin.listMentors();
  }

  @Get('teams')
  teams(
    @Query()
    query: {
      theme?: string;
      institute?: string;
      mentor?: string;
      status?: string;
      department?: string;
      page?: string;
      limit?: string;
    },
  ) {
    return this.admin.listTeams(query);
  }

  @Get('audit-log')
  audit(@Query() query: { page?: string; limit?: string; action?: string; entityType?: string }) {
    return this.admin.listAudit(query);
  }

  @Get('reviews/overdue')
  overdue() {
    return this.admin.overdueReviews();
  }

  @Get('settings')
  settings() {
    return this.admin.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body(new ZodPipe(settingsSchema)) body: unknown) {
    return this.admin.updateSettings(body as never);
  }

  @Post('export')
  export(@CurrentUser() user: AuthUser, @Body(new ZodPipe(exportSchema)) body: unknown) {
    return this.admin.enqueueExport(user, body as never);
  }

  @Get('export/:jobId')
  exportStatus(@Param('jobId') jobId: string) {
    return this.admin.exportStatus(jobId);
  }

  @Get('export/:jobId/file')
  file(@Param('jobId') jobId: string) {
    const { stream, type } = this.admin.openLocalExport(jobId);
    return new StreamableFile(stream, { type });
  }

  @Post('users/invite')
  inviteUser(@CurrentUser() user: AuthUser, @Body(new ZodPipe(adminInviteUserSchema)) body: unknown) {
    return this.admin.inviteStaff(user, body as never);
  }

  @Post('users/import')
  importUsers(@CurrentUser() user: AuthUser, @Body() body: { csv: string }) {
    return this.admin.queueImport(user, body.csv);
  }

  @Get('users/import/:batchId')
  getImport(@Param('batchId') batchId: string) {
    return this.admin.getImport(batchId);
  }

  @Get('users/import/:batchId/status')
  getImportStatus(@Param('batchId') batchId: string) {
    return this.admin.getImportStatus(batchId);
  }

  @Post('users/import/:batchId/activate')
  activateImport(@Param('batchId') batchId: string) {
    return this.admin.activateImport(batchId);
  }

  @Post('users/import/:batchId/reject')
  rejectImport(@Param('batchId') batchId: string) {
    return this.admin.rejectImport(batchId);
  }

  @Post('ops/clear-seed')
  clearSeed(@Body() body: { confirm?: string }) {
    return this.admin.clearSeedData(String(body?.confirm ?? ''));
  }
}
