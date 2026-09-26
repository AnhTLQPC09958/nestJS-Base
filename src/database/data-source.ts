import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

// Load .env
loadEnv();

/**
 * DataSource cho TypeORM CLI (migration:generate, migration:run...).
 * CLI chạy ngoài NestJS context → không dùng được ConfigService.
 * → Đọc trực tiếp process.env.
 */

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // Migration sẽ quét file trong src/database/migrations/
  entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],

  // KHÔNG bật synchronize ở CLI — migration phải là nguồn sự thật
  synchronize: false,
  logging: ['query', 'error', 'warn'],
  timezone: '+07:00',
});
