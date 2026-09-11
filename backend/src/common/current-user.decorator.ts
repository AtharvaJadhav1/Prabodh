import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './auth.types';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
  return req.user;
});
