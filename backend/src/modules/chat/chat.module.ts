import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [TeamsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
