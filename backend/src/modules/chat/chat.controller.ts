import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../../common/auth.types';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { CHAT_ROLES } from '../../lib/chat-rules';
import { ChatService } from './chat.service';
import { friendRequestSchema, sendMessageSchema } from './schema';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CHAT_ROLES)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('people')
  searchPeople(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chat.searchPeople(user, q, limit, cursor);
  }

  @Get('people/:userId')
  getPerson(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.chat.getPerson(user, userId);
  }

  @Post('friends/requests')
  sendRequest(@CurrentUser() user: AuthUser, @Body(new ZodPipe(friendRequestSchema)) body: unknown) {
    return this.chat.sendFriendRequest(user, (body as { userId: string }).userId);
  }

  @Get('friends/requests')
  listRequests(@CurrentUser() user: AuthUser) {
    return this.chat.listRequests(user);
  }

  @Post('friends/requests/:id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.acceptRequest(user, id);
  }

  @Post('friends/requests/:id/decline')
  decline(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.declineRequest(user, id);
  }

  @Delete('friends/requests/:id')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.cancelRequest(user, id);
  }

  @Get('friends')
  listFriends(@CurrentUser() user: AuthUser) {
    return this.chat.listFriends(user);
  }

  @Delete('friends/:userId')
  unfriend(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.chat.unfriend(user, userId);
  }

  @Get('conversations')
  conversations(@CurrentUser() user: AuthUser) {
    return this.chat.listConversations(user);
  }

  @Get('unread')
  unread(@CurrentUser() user: AuthUser) {
    return this.chat.unreadSummary(user);
  }

  @Delete('dm/messages/:messageId')
  deleteMessage(@CurrentUser() user: AuthUser, @Param('messageId') messageId: string) {
    return this.chat.deleteMessage(user, messageId);
  }

  @Get('dm/:userId/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Query('after') after?: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.listMessages(user, userId, { after, before, limit });
  }

  @Post('dm/:userId/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body(new ZodPipe(sendMessageSchema)) body: unknown,
  ) {
    return this.chat.sendMessage(user, userId, body as { body: string; clientId?: string | null });
  }

  @Post('dm/:userId/read')
  markDmRead(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.chat.markDmRead(user, userId);
  }

  @Post('groups/:teamId/read')
  markGroupRead(@CurrentUser() user: AuthUser, @Param('teamId') teamId: string) {
    return this.chat.markGroupRead(user, teamId);
  }
}
