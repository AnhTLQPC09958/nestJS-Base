import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';
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
export class RevokedTokensService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RevokedTokensService.name);

  // In-memory Set lưu nhanh các JTI đã bị revoke trong RAM (O(1))
  // Loại bỏ 100% câu query SELECT vào MySQL trên mỗi request có gắn JWT!
  private readonly memoryRevokedSet = new Set<string>();

  constructor(
    @InjectRepository(RevokedToken)
    private readonly repo: Repository<RevokedToken>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const activeList = await this.repo.find({
        where: { expiresAt: MoreThan(new Date()) },
        select: { jti: true },
      });
      for (const item of activeList) {
        this.memoryRevokedSet.add(item.jti);
      }
      this.logger.log(
        `⚡ Đã nạp ${this.memoryRevokedSet.size} revoked tokens còn hạn vào bộ nhớ RAM`,
      );
    } catch (err) {
      this.logger.warn(
        `Không thể nạp revoked tokens vào RAM: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Check jti có bị revoke không (O(1) trong RAM, không chạm MySQL)
   */
  isRevoked({ jti }: { jti: string }): boolean {
    if (this.memoryRevokedSet.has(jti)) return true;
    return false;
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

    this.memoryRevokedSet.add(params.jti);

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

    items.forEach((i) => this.memoryRevokedSet.add(i.jti));

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

    // Refresh lại Set trong RAM từ DB để loại bỏ các token đã hết hạn
    const activeList = await this.repo.find({
      where: { expiresAt: MoreThan(new Date()) },
      select: { jti: true },
    });
    this.memoryRevokedSet.clear();
    for (const item of activeList) {
      this.memoryRevokedSet.add(item.jti);
    }

    if (count > 0) {
      this.logger.log(
        `🧹 Đã xoá ${count} revoked_token hết hạn (RAM còn ${this.memoryRevokedSet.size})`,
      );
    }
    return count;
  }
}
