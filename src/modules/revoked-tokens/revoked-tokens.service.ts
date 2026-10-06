import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import ms from 'ms';
import type { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';

import { RevokedToken } from './entities/revoked-token.entity';

export interface RevokeParams {
  jti: string;
  userId: number;
  deviceId: string;
  reason: string;
}

export interface RevokeManyItem {
  jti: string;
  userId: number;
  deviceId: string;
  revokedReason: string;
}

@Injectable()
export class RevokedTokensService {
  private readonly logger = new Logger(RevokedTokensService.name);

  constructor(
    @InjectRepository(RevokedToken)
    private readonly repo: Repository<RevokedToken>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Check jti có bị revoke không.
   * Gọi từ JwtStrategy.validate() mỗi request authenticated.
   */
  async isRevoked(jti: string): Promise<boolean> {
    const exists = await this.repo.exists({ where: { jti } });
    return exists;
  }

  /**
   * Revoke — gọi khi logout hoặc revoke device.
   * Idempotent: nếu jti đã tồn tại → skip.
   */
  async revoke(params: RevokeParams): Promise<void> {
    const accessExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.accessExpiresIn',
    );
    const expiresAt = new Date(Date.now() + ms(accessExpiresIn));

    try {
      await this.repo.insert({
        jti: params.jti,
        userId: params.userId,
        deviceId: params.deviceId,
        expiresAt,
        revokedReason: params.reason,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // ER_DUP_ENTRY = đã revoke rồi → OK
      if (code === 'ER_DUP_ENTRY') return;
      // Log lỗi khác nhưng không throw — không được làm vỡ business flow
      this.logger.error(
        `Ghi revoked_token thất bại (jti=${params.jti}): ${(err as Error).message}`,
      );
    }
  }

  async revokeMany(items: RevokeManyItem[]): Promise<void> {
    if (items.length === 0) return;

    const accessExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.accessExpiresIn',
    );
    const expiresAt = new Date(Date.now() + ms(accessExpiresIn));

    try {
      await this.repo.insert(
        items.map((i) => ({
          jti: i.jti,
          userId: i.userId,
          deviceId: i.deviceId,
          revokedReason: i.revokedReason,
          expiresAt,
          revokedAt: new Date(),
        })),
      );
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'ER_DUP_ENTRY') {
        await Promise.all(
          items.map((i) =>
            this.revoke({
              jti: i.jti,
              userId: i.userId,
              deviceId: i.deviceId,
              reason: i.revokedReason,
            }),
          ),
        );
        return;
      }
      this.logger.error(`revokeMany thất bại: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Cron cleanup: xoá row có expires_at < now.
   * Entry cũ hơn access TTL không cần thiết (access token đã hết hạn tự nhiên).
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.repo.delete({
      expiresAt: LessThan(new Date()),
    });
    const count = result.affected ?? 0;
    if (count > 0) {
      this.logger.log(`🧹 Đã xoá ${count} revoked_token hết hạn`);
    }
    return count;
  }
}
