import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { RevokedTokensService } from './revoked-tokens.service';

@Injectable()
export class RevokedTokensCron {
  private readonly logger = new Logger(RevokedTokensCron.name);

  constructor(private readonly service: RevokedTokensService) {}

  /**
   * Chạy 00:20 mỗi ngày.
   * Xoá revoked token đã hết hạn (> 5 phút).
   *
   */
  @Cron('20 0 * * *', {
    name: 'cleanup-revoked-tokens',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleCleanup(): Promise<void> {
    this.logger.log('🧹 Bắt đầu cleanup revoked_tokens');
    try {
      const count = await this.service.cleanupExpired();
      this.logger.log(`✅ Cleanup revoked_tokens xong — đã xoá ${count} row`);
    } catch (err) {
      this.logger.error(
        `Cleanup revoked_tokens thất bại: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
