/**
 * Schema validate biến môi trường.
 * Nếu thiếu biến bắt buộc hoặc sai format → app CRASH ngay khi start.
 * Nguyên tắc: fail fast, không để lỗi ngầm chạy runtime.
 */
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ===== APP =====
  NODE_ENV: Joi.string()
    .valid(`development`, 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  // ===== CORS =====
  CORS_ORIGINS: Joi.string().required(),

  // ===== DATABASE =====
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // ===== JWT =====
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
});
