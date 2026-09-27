import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import ms from 'ms';
import type { StringValue } from 'ms';

import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { ErrorCode } from '../../common/constants';
import {
  Public,
  CurrentUser,
  DeviceId,
  ThrottleAuth,
} from '../../common/decorators';
import { type AuthUser } from '../../common/types';
import { CoreException } from '../../common/exceptions';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @ThrottleAuth()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @DeviceId() deviceId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!deviceId) {
      throw new CoreException(
        ErrorCode.VALIDATION_FAILED,
        'Thiếu header X-Device-Id',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { accessToken, refreshToken, permissions } =
      await this.authService.login(dto, deviceId);

    this.setRefreshCookie(res, refreshToken);
    return { accessToken, permissions };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @DeviceId() deviceId: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!deviceId) {
      throw new CoreException(
        ErrorCode.VALIDATION_FAILED,
        'Thiếu header X-Device-Id',
        HttpStatus.BAD_REQUEST,
      );
    }

    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException(
        ErrorCode.AUTH_REFRESH_TOKEN_MISSING,
        'Không có refresh token',
      );
    }

    const { accessToken } = await this.authService.refresh(token, deviceId);
    return { accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  // ===== FORGOT PASSWORD =====
  @Public()
  @ThrottleAuth()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return {
      message: 'Nếu email tồn tại, mã OTP đã được gửi đến hộp thư của bạn',
    };
  }

  // ===== RESET PASSWORD =====
  @Public()
  @ThrottleAuth()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  // ===== CHANGE PASSWORD =====
  @ThrottleAuth()
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { message: 'Đổi mật khẩu thành công' };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  private setRefreshCookie(res: Response, token: string): void {
    const isProd = this.config.get<string>('app.nodeEnv') === 'production';
    const refreshExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.refreshExpiresIn',
    );
    const maxAge = ms(refreshExpiresIn);

    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
  }
}
