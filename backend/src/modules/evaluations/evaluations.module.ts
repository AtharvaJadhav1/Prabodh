import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './service';

@Module({
  imports: [TeamsModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
