import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { AuthUser } from 'src/common/types';
import { ErrorCode } from 'src/common/constants';

interface JwtPayload {
  sub: number;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }
  /**
   * Chạy SAU khi verify token thành công.
   * Return value → gắn vào req.user.
   */

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.authService.buildAuthUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        ErrorCode.UNAUTHORIZED,
        'Token hợp lệ nhưng user không tồn tại',
      );
    }
    return user;
  }
}
