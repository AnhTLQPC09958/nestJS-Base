import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Module kết nối DB.
 * Dùng forRootAsync để đọc config qua ConfigService (đã validate từ C2).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),

        // Tự động load entity từ mọi module đã import TypeOrmModule.forFeautre
        autoLoadEntities: true,

        // Chỉ phật synchronize ở dev
        synchronize: config.get<string>('app.nodeEnv') === 'development',

        // Log query khi dev
        logging:
          config.get<string>('app.nodeEnv') === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],

        timezone: '+07:00',
      }),
    }),
  ],
})
export class DatabaseModule {}
