/**
 * Lấy user từ request (đã được JwtStrategy gắn vào).
 * @CurrentUser() → toàn bộ AuthUser
 * @CurrentUser('id') → chỉ trả về user.id
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    return data ? user?.[data] : user;
  },
);
