import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '../constants';
import { ForbiddenException } from '../exceptions';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/check-permission.decorator';
import { AuthUser } from '../types';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Lấy metadata @CheckPermission — nếu không có → cho qua
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      throw new ForbiddenException(
        ErrorCode.UNAUTHORIZED,
        'Chưa đăng nhập hoặc token không hợp lệ',
      );
    }

    const actions = user.permissions[required.module] ?? [];
    if (!actions.includes(required.action)) {
      throw new ForbiddenException(
        ErrorCode.FORBIDDEN,
        `Không có quyền "${required.action}" trên module "${required.module}"`,
      );
    }

    return true;
  }
}
