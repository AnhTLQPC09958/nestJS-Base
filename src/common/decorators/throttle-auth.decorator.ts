import { Throttle } from '@nestjs/throttler';

/**
 * Rate limit cho auth endpoints — 5 request/phút.
 * Dùng cho: login, forgot-password, reset-password, change-password.
 */
export const ThrottleAuth = () =>
  Throttle({ default: { limit: 5, ttl: 60000 } });
