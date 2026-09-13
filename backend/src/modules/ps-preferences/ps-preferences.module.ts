import { Module } from '@nestjs/common';
import { ProblemStatementsModule } from '../problem-statements/problem-statements.module';
import { TeamsModule } from '../teams/teams.module';
import { PsPreferencesController } from './ps-preferences.controller';
import { PsPreferencesRepository } from './repository';
import { PsPreferencesService } from './service';

@Module({
  imports: [TeamsModule, ProblemStatementsModule],
  controllers: [PsPreferencesController],
  providers: [PsPreferencesService, PsPreferencesRepository],
})
export class PsPreferencesModule {}
