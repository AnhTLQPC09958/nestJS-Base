const SENSITIVE_KEYS = new Set([
  'password',
  'oldpassword',
  'newpassword',
  'passwordhash',
  'accesstoken',
  'refreshtoken',
  'token',
  'otp',
  'code',
  'secret',
  'apikey',
  'secretkey',
]);

const MASK = '***';

/**
 * Đệ quy mask sensitive fields trong object/array.
 * Key comparison case-insensitive.
 * Không mutate input — trả về bản copy.
 */
export function maskSensitive(input: unknown): unknown {
  if (input === null || input === undefined) return input;

  if (Array.isArray(input)) {
    return input.map((item) => maskSensitive(item));
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      input as Record<string, unknown>,
    )) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = MASK;
      } else {
        result[key] = maskSensitive(value);
      }
    }
    return result;
  }

  return input;
}
