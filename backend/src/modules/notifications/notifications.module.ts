import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './service';

@Module({
  imports: [TeamsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
