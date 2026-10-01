import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { getClientIp } from '../../modules/audit-log/utils/get-client-ip.util';

export interface ClientInfo {
  ip: string;
  userAgent: string | null;
  deviceId: string | null;
}

/**
 * Lấy IP + User-Agent + device-id trong 1 decorator.
 * Dùng cho các endpoint cần ghi log (login, audit).
 */
export const ClientInfo = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ClientInfo => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return {
      ip: getClientIp(req),
      userAgent: (req.headers['user-agent'] as string) ?? null,
      deviceId: (req.headers['device-id'] as string) ?? null,
    };
  },
);
