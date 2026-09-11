import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { ProblemStatementsController } from './problem-statements.controller';
import { ProblemStatementsRepository } from './repository';
import { ProblemStatementsService } from './service';

@Module({
  imports: [TeamsModule],
  controllers: [ProblemStatementsController],
  providers: [ProblemStatementsService, ProblemStatementsRepository],
  exports: [ProblemStatementsService],
})
export class ProblemStatementsModule {}
