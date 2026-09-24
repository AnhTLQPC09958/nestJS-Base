import { Controller, Get, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
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
