import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '@prisma/client';
import { AuthUser } from './auth.types';
import { allRoles } from '../lib/roles';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<PlatformRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');
    // Dual-role accounts pass when ANY held role (primary or secondary) is allowed. This only gates
    // the endpoint: handlers that serve workspace-specific data (e.g. ?mentorType=) MUST scope by it
    // themselves, since a dual-role user holds both mentor roles at once.
    if (!roles.some((r) => allRoles(user).includes(r))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
