import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { MentorsModule } from '../mentors/mentors.module';
import { TeamsModule } from '../teams/teams.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './service';

@Module({
  imports: [TeamsModule, MentorsModule, ChatModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
