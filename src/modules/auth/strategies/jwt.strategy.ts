import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { AuthUser } from 'src/common/types';
import { ErrorCode } from 'src/common/constants';
import { Request } from 'express';
import { RevokedTokensService } from 'src/modules/revoked-tokens/revoked-tokens.service';

interface JwtPayload {
  sub: number;
  username: string;
  deviceId: string;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
    private readonly revokedTokensService: RevokedTokensService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
      passReqToCallback: true,
    });
  }
  /**
   * Chạy SAU khi verify token thành công.
   * Return value → gắn vào req.user.
   */

  async validate(req: Request, payload: JwtPayload): Promise<AuthUser> {
    // Lấy device_id từ header
    const raw = req.headers['device-id'];
    const headerDeviceId = Array.isArray(raw) ? raw[0] : raw;

    if (!headerDeviceId) {
      throw new UnauthorizedException(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Thiếu header device-id',
      );
    }

    if (payload.jti) {
      const revoked = this.revokedTokensService.isRevoked({ jti: payload.jti });
      if (revoked) {
        throw new UnauthorizedException(
          ErrorCode.AUTH_TOKEN_INVALID,
          'Phiên đăng nhập đã bị thu hồi',
        );
      }
    }

    // Verify device khớp token
    if (headerDeviceId !== payload.deviceId) {
      throw new UnauthorizedException(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Device ID không khớp với token',
      );
    }

    return this.authService.buildAuthUser(payload.sub, headerDeviceId);
  }
}
