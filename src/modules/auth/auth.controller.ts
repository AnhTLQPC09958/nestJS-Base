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
  FirstChangePasswordDto,
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
  ClientInfo,
  type ClientInfo as ClientInfoType,
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
    @ClientInfo() client: ClientInfoType,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!deviceId) {
      throw new CoreException(
        ErrorCode.VALIDATION_FAILED,
        'Thiếu header device-id',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { accessToken, refreshToken, permissions } =
      await this.authService.login(dto, deviceId, client);

    this.setRefreshCookie(res, refreshToken);
    return { accessToken, permissions };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @DeviceId() deviceId: string | undefined,
    @ClientInfo() client: ClientInfoType,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!deviceId) {
      throw new CoreException(
        ErrorCode.VALIDATION_FAILED,
        'Thiếu header device-id',
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

    const { accessToken, refreshToken } = await this.authService.refresh(
      token,
      deviceId,
      client,
    );

    // Rotate cookie — refresh token mới (jti mới)
    this.setRefreshCookie(res, refreshToken);

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser('id') userId: number,
    @DeviceId() deviceId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(userId, deviceId);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  // ===== FORGOT PASSWORD =====
  @Public()
  @ThrottleAuth()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @ClientInfo() client: ClientInfoType,
  ) {
    await this.authService.forgotPassword(dto, client);
    return {
      message: 'Nếu email tồn tại, mã OTP đã được gửi đến hộp thư của bạn',
    };
  }

  // ===== RESET PASSWORD =====
  @Public()
  @ThrottleAuth()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @ClientInfo() client: ClientInfoType,
  ) {
    await this.authService.resetPassword(dto, client);
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  @Patch('first-change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ThrottleAuth()
  async firstChangePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: FirstChangePasswordDto,
    @ClientInfo() client: ClientInfoType,
  ) {
    await this.authService.firstChangePassword(userId, dto, client);
  }

  // ===== CHANGE PASSWORD =====
  @ThrottleAuth()
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
    @ClientInfo() client: ClientInfoType,
  ) {
    await this.authService.changePassword(userId, dto, client);
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
