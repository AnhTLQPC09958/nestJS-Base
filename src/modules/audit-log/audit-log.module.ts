import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLog } from './entities/audit-log.entity';
import { LoginLog } from './entities/login-log.entity';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { AuditLogCron } from './audit-log.cron';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

/**
 * @Global để AuditLogService inject được từ module khác (Auth module).
 * Interceptor export để app.module đăng ký global nếu cần (nhưng KHÔNG nên —
 * vì decorator-based, không cần global interceptor).
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, LoginLog])],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogCron, AuditLogInterceptor],
  exports: [AuditLogService, AuditLogInterceptor],
})
export class AuditLogModule {}
