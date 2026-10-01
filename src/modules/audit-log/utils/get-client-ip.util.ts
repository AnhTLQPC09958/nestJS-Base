import type { Request } from 'express';

/**
 * Lấy IP client. Xử lý trường hợp sau reverse proxy.
 * ưu tiên X-Forwarded-For nếu có .
 */
export function getClientIp(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}
