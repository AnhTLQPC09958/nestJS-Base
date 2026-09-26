import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  /**
   * Gửi OTP quên mật khẩu.
   * @returns void — throw error nếu send fail
   */
  async sendOtpEmail(
    to: string,
    otp: string,
    fullName?: string,
  ): Promise<void> {
    try {
      await this.mailer.sendMail({
        to,
        subject: '[Nest Base] Mã OTP đặt lại mật khẩu',
        template: 'otp',
        context: {
          otp,
          fullName: fullName ?? to,
          expiresIn: '5 phút',
          year: new Date().getFullYear(),
        },
      });
      this.logger.log(`OTP email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Send OTP to ${to} failed`, error as Error);
      throw error;
    }
  }
}
