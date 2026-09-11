import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { StagesController } from './stages.controller';
import { StagesService } from './service';

@Module({
  imports: [TeamsModule],
  controllers: [StagesController],
  providers: [StagesService],
  exports: [StagesService],
})
export class StagesModule {}
