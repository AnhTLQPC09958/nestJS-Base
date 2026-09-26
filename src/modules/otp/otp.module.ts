import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtpToken } from './entities/otp-token.entity';
import { OtpService } from './otp.service';

@Module({
  imports: [TypeOrmModule.forFeature([OtpToken])],
  providers: [OtpService],
  exports: [OtpService, TypeOrmModule],
})
export class OtpModule {}
