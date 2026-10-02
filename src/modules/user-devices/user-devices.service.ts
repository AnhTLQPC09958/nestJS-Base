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

// const REVOKE_REASON = {
//   LOGOUT: 'logout',
//   FORCE_LOGOUT: 'force_logout',
//   ADMIN_REVOKE: 'admin_revoke',
//   EXPIRED: 'expired',
// } as const;

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
    reason = 'logout',
  ): Promise<UserDevice | null> {
    const row = await this.repo.findOne({
      where: { userId, deviceId, isActive: true },
    });
    if (!row) return null;

    await this.repo.update(
      { id: row.id },
      { isActive: false, revokedAt: new Date(), revokedReason: reason },
    );

    return row;
  }

  /** Admin/user revoke device theo id (kiểm tra ownership) */
  async revokeById(
    id: number,
    userId: number,
    reason = 'admin_revoke',
  ): Promise<UserDevice | null> {
    const row = await this.repo.findOne({
      where: { id, userId, isActive: true },
    });
    if (!row) return null;

    await this.repo.update(
      { id },
      { isActive: false, revokedAt: new Date(), revokedReason: reason },
    );

    return row;
  }

  /** Revoke tất cả device khác current */
  async revokeAllExcept(
    userId: number,
    exceptDeviceId: string,
    reason = 'force_logout',
  ): Promise<UserDevice[]> {
    const rows = await this.repo.find({
      where: { userId, isActive: true },
    });
    const toRevoke = rows.filter((r) => r.deviceId !== exceptDeviceId);
    if (toRevoke.length === 0) return [];

    const ids = toRevoke.map((r) => r.id);
    await this.repo.update(ids, {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason,
    });

    return toRevoke;
  }

  /** Refresh: update lastActiveAt + expiresAt, KHÔNG đổi jti */
  async touchSession(userId: number, deviceId: string): Promise<void> {
    const refreshExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.refreshExpiresIn',
    );
    const expiresAt = new Date(Date.now() + ms(refreshExpiresIn));

    await this.repo.update(
      { userId, deviceId, isActive: true },
      { lastActiveAt: new Date(), expiresAt },
    );
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
