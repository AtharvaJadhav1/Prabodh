import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsRepository } from './repository';
import { TeamsService } from './service';

@Module({
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository],
  exports: [TeamsService, TeamsRepository],
})
export class TeamsModule {}
