import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import ms from 'ms';
import type { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';

import { UserDevice } from './entities/user-device.entity';
import { UserDeviceResponseDto } from './dto/user-device-response.dto';

export interface UpsertSessionParams {
  userId: number;
  deviceId: string;
  jti: string;
  userAgent: string | null;
  ipAddress: string | null;
}

const REVOKE_REASON = {
  LOGOUT: 'logout',
  FORCE_LOGOUT: 'force_logout',
  ADMIN_REVOKE: 'admin_revoke',
  EXPIRED: 'expired',
} as const;

@Injectable()
export class UserDevicesService {
  private readonly logger = new Logger(UserDevicesService.name);

  constructor(
    @InjectRepository(UserDevice)
    private readonly repo: Repository<UserDevice>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Login: upsert theo (userId, deviceId).
   * Nếu row cũ tồn tại (kể cả đã revoke) → update thành active với jti mới.
   * Đảm bảo mỗi device chỉ có 1 row active.
   */
  async upsertSession(params: UpsertSessionParams): Promise<UserDevice> {
    const refreshExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.refreshExpiresIn',
    );
    const expiresAt = new Date(Date.now() + ms(refreshExpiresIn));

    let row = await this.repo.findOne({
      where: { userId: params.userId, deviceId: params.deviceId },
    });

    if (row) {
      row.jti = params.jti;
      row.userAgent = params.userAgent;
      row.ipAddress = params.ipAddress;
      row.lastActiveAt = new Date();
      row.expiresAt = expiresAt;
      row.isActive = true;
      row.revokedAt = null;
      row.revokedReason = null;
    } else {
      row = this.repo.create({
        userId: params.userId,
        deviceId: params.deviceId,
        jti: params.jti,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        lastActiveAt: new Date(),
        expiresAt,
        isActive: true,
      });
    }

    return this.repo.save(row);
  }

  /** Refresh: rotate jti mới, update lastActiveAt + expiresAt */
  async rotateSession(
    userId: number,
    deviceId: string,
    newJti: string,
  ): Promise<void> {
    const refreshExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.refreshExpiresIn',
    );
    const expiresAt = new Date(Date.now() + ms(refreshExpiresIn));

    await this.repo.update(
      { userId, deviceId, isActive: true },
      {
        jti: newJti,
        lastActiveAt: new Date(),
        expiresAt,
      },
    );
  }

  /**
   * Verify refresh: tìm row active theo (userId, deviceId, jti).
   * Trả null nếu không có → refresh fail.
   */
  async findActiveByJti(
    userId: number,
    deviceId: string,
    jti: string,
  ): Promise<UserDevice | null> {
    return this.repo.findOne({
      where: { userId, deviceId, jti, isActive: true },
    });
  }

  async listByUser(
    userId: number,
    currentDeviceId?: string,
  ): Promise<UserDeviceResponseDto[]> {
    const rows = await this.repo.find({
      where: { userId, isActive: true },
      order: { lastActiveAt: 'DESC' },
    });
    return rows.map((r) =>
      UserDeviceResponseDto.fromEntity(r, currentDeviceId),
    );
  }

  /** User logout — revoke theo device_id */
  async revokeByDevice(
    userId: number,
    deviceId: string,
    reason: string = REVOKE_REASON.LOGOUT,
  ): Promise<void> {
    await this.repo.update(
      { userId, deviceId, isActive: true },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    );
  }

  /** Admin/user revoke device theo id (kiểm tra ownership) */
  async revokeById(
    id: number,
    userId: number,
    reason: string = REVOKE_REASON.ADMIN_REVOKE,
  ): Promise<boolean> {
    const row = await this.repo.findOne({ where: { id, userId } });
    if (!row) return false;
    await this.repo.update(
      { id },
      { isActive: false, revokedAt: new Date(), revokedReason: reason },
    );
    return true;
  }

  /** Revoke tất cả device khác current */
  async revokeAllExcept(
    userId: number,
    exceptDeviceId: string,
    reason: string = REVOKE_REASON.FORCE_LOGOUT,
  ): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(UserDevice)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      })
      .where('user_id = :userId', { userId })
      .andWhere('device_id != :exceptDeviceId', { exceptDeviceId })
      .andWhere('is_active = 1')
      .execute();
    return result.affected ?? 0;
  }

  /**
   * Cron cleanup: xoá row inactive hoặc hết hạn > 30 ngày.
   * Batch 1000, nghỉ 100ms giữa batch.
   */
  async cleanupStale(): Promise<number> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let total = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rows = await this.repo.find({
        where: [
          { isActive: false, revokedAt: LessThan(cutoff) },
          { isActive: false, expiresAt: LessThan(cutoff) },
        ],
        select: { id: true },
        take: 1000,
      });
      if (rows.length === 0) break;

      const ids = rows.map((r) => r.id);
      await this.repo.delete(ids);
      total += ids.length;
      if (rows.length < 1000) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    if (total > 0) {
      this.logger.log(`🧹 Đã xoá ${total} user_devices stale`);
    }
    return total;
  }
}
