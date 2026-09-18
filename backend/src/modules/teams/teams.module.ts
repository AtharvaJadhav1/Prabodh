import { Module } from '@nestjs/common';
import { JoinRequestsController } from './join-requests.controller';
import { TeamsController } from './teams.controller';
import { TeamsRepository } from './repository';
import { TeamsService } from './service';

@Module({
  controllers: [TeamsController, JoinRequestsController],
  providers: [TeamsService, TeamsRepository],
  exports: [TeamsService, TeamsRepository],
})
export class TeamsModule {}
