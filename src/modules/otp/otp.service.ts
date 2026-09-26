import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash, randomInt } from 'crypto';

import { OtpToken, OtpPurpose } from './entities/otp-token.entity';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly length: number;
  private readonly expiresMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    @InjectRepository(OtpToken)
    private readonly otpRepo: Repository<OtpToken>,
    private readonly config: ConfigService,
  ) {
    this.length = this.config.getOrThrow<number>('otp.length');
    this.expiresMinutes = this.config.getOrThrow<number>('otp.expiresMinutes');
    this.maxAttempts = this.config.getOrThrow<number>('otp.maxAttempts');
  }

  /**
   * Sinh OTP mới cho user.
   * - Invalidate OTP cũ cùng purpose (mark used)
   * - Trả về plain OTP (chỉ có lần này — caller gửi email)
   */
  async generate(userId: number, purpose: OtpPurpose): Promise<string> {
    // Invalidate OTP cũ cùng user + purpose
    await this.otpRepo.update(
      { userId, purpose, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const plainOtp = this.generateRandomCode();
    const codeHash = this.hash(plainOtp);
    const expiresAt = new Date(Date.now() + this.expiresMinutes * 60 * 1000);

    await this.otpRepo.save(
      this.otpRepo.create({
        userId,
        codeHash,
        purpose,
        expiresAt,
        attemptCount: 0,
      }),
    );

    this.logger.log(`🔐 OTP generated for user ${userId} (${purpose})`);
    return plainOtp;
  }

  /**
   * Verify OTP. Trả về true nếu đúng + mark used.
   */
  async verify(
    userId: number,
    purpose: OtpPurpose,
    plainOtp: string,
  ): Promise<boolean> {
    const otp = await this.otpRepo.findOne({
      where: { userId, purpose },
      order: { id: 'DESC' },
    });

    if (!otp) return false;
    if (otp.isUsed()) return false;
    if (otp.isExpired()) return false;

    if (otp.attemptCount >= this.maxAttempts) {
      otp.usedAt = new Date();
      await this.otpRepo.save(otp);
      return false;
    }

    // Tăng attempt
    otp.attemptCount += 1;

    const incomingHash = this.hash(plainOtp);
    if (incomingHash !== otp.codeHash) {
      await this.otpRepo.save(otp);
      return false;
    }

    // Đúng → mark used
    otp.usedAt = new Date();
    await this.otpRepo.save(otp);
    return true;
  }

  /**
   * Cleanup OTP hết hạn — chạy mỗi giờ.
   * Xóa OTP đã hết hạn > 24h.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.otpRepo.delete({
      expiresAt: LessThan(cutoff),
    });
    if (result.affected && result.affected > 0) {
      this.logger.log(`🧹 Cleaned up ${result.affected} expired OTPs`);
    }
  }

  // ===== HELPERS =====
  private generateRandomCode(): string {
    const max = 10 ** this.length;
    return randomInt(0, max).toString().padStart(this.length, '0');
  }

  private hash(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }
}
