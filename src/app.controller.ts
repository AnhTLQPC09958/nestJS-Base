import { Controller, Get, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';
import { MailService } from './modules/mail/mail.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailService: MailService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-send-mail')
  async testSendMail() {
    await this.mailService.sendOtpEmail(
      'anhvy01250304@gmail.com',
      '123456',
      'Test User',
    );
    return { message: 'Email sent' };
  }

  // ===== Endpoint test filter - Xóa sau khi verify =====
  @Get('test-error-core')
  testError(): never {
    throw new NotFoundException('Không tìm thấy người dùng test');
  }

  @Get('test-error-runtime')
  testErrorRuntime(): never {
    throw new Error('Lỗi runtime bất ngờ');
  }
}
