import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserDevicesService } from './user-devices.service';

@Injectable()
export class UserDevicesCron {
  private readonly logger = new Logger(UserDevicesCron.name);

  constructor(private readonly service: UserDevicesService) {}

  /** 00:10 ngày 1 mỗi tháng — xoá session inactive > 30 ngày */
  @Cron('10 0 1 * *', {
    name: 'cleanup-user-devices',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  async handleCleanup(): Promise<void> {
    try {
      await this.service.cleanupStale();
    } catch (err) {
      this.logger.error(
        `Cleanup user_devices thất bại: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
