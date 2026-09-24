import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '../exceptions';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/check-permission.decorator';
import { AuthUser } from '../types';
import { Observable } from 'rxjs';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy metadata @CheckPermission, nếu không có -> cho qua
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      throw new ForbiddenException('Chưa đăng nhập');
    }

    const actions = user.permissions[required.module] ?? [];
    if (!actions.includes(required.action)) {
      throw new ForbiddenException(
        `Không có quyền "${required.action}" trên module "${required.module}"`,
      );
    }

    return true;
  }
}
