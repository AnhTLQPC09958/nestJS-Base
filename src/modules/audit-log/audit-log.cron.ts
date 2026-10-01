import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogCron {
  private readonly logger = new Logger(AuditLogCron.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Chạy 00:05 ngày 1 mỗi tháng.
   * Cron expression: `phút giờ ngày-tháng tháng thứ-trong-tuần`
   *   → '5 0 1 * *' = 00:05 ngày 1
   * Xoá log cũ hơn 60 ngày.
   */
  @Cron('5 0 1 * *', {
    name: 'cleanup-audit-log',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleCleanup(): Promise<void> {
    this.logger.log('🧹 Bắt đầu cleanup audit log định kỳ');
    try {
      const result = await this.auditLogService.cleanupExpired();
      this.logger.log(
        `Cleanup xong — audit=${result.audit}, login=${result.login}`,
      );
    } catch (err) {
      this.logger.error(
        `Cleanup thất bại: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
