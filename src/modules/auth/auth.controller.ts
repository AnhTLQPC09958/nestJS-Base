import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { ErrorCode } from 'src/common/constants';
import type { Request, Response } from 'express';
import ms, { StringValue } from 'ms';
import { Public } from 'src/common/decorators';
const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, permissions } =
      await this.authService.login(dto);

    // set refresh token vào httpOnly cookie
    this.setRefreshCookie(res, refreshToken);

    return { accessToken, permissions };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException(
        ErrorCode.AUTH_REFRESH_TOKEN_MISSING,
        'Không có refresh token',
      );
    }

    const { accessToken } = await this.authService.refresh(token);

    // Rotate refresh token (tùy chọn — bảo mật cao hơn)
    return { accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Get('me')
  async me(@Req() req: Request) {
    // Tạm thời lấy userId từ header — C5d sẽ thay bằng JWT Guard
    const userId = Number(req.headers['x-user-id']);
    if (!userId) {
      throw new UnauthorizedException(ErrorCode.UNAUTHORIZED, 'Chưa đăng nhập');
    }
    return this.authService.getMe(userId);
  }

  // ===== HELPER =====

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
      maxAge: maxAge,
    });
  }
}
