import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin/admin.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { IdentityModule } from './modules/identity/identity.module';
import { MentorsModule } from './modules/mentors/mentors.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProblemStatementsModule } from './modules/problem-statements/problem-statements.module';
import { PsPreferencesModule } from './modules/ps-preferences/ps-preferences.module';
import { StagesModule } from './modules/stages/stages.module';
import { TeamsModule } from './modules/teams/teams.module';
import { PrismaModule } from './lib/prisma.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    IdentityModule,
    TeamsModule,
    ProblemStatementsModule,
    PsPreferencesModule,
    MentorsModule,
    StagesModule,
    EvaluationsModule,
    NotificationsModule,
    AdminModule,
  ],
})
export class AppModule {}
