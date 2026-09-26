import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Lấy X-Device-Id từ request header.
 */
export const DeviceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const raw = request.headers['device-id'];
    return Array.isArray(raw) ? raw[0] : raw;
  },
);
