import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@delta-signal/shared';
import type { Request } from 'express';
import type { JwtPayload } from '../decorators/current-user.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsService } from '../../permissions/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    const user = request.user;
    if (!user) return false;

    // ADMIN always passes every permission check — prevents admin lockout even
    // if all DB grants are wiped.
    if (user.role === 'ADMIN') return true;

    const granted = await this.permissionsService.getPermissionsForRole(user.role);
    if (!required.every((p) => granted.includes(p))) {
      throw new ForbiddenException('Insufficient permission');
    }
    return true;
  }
}
