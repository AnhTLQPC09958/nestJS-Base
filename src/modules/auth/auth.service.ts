import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserStatus } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';
import { ConfigService } from '@nestjs/config';
import {
  ChangePasswordDto,
  FirstChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { ErrorCode } from 'src/common/constants';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { AuthUser, PermissionsMap } from 'src/common/types';
import { MailService } from '../mail/mail.service';
import { OtpService } from '../otp/otp.service';
import { OtpPurpose } from '../otp/entities/otp-token.entity';
import { CoreException, ForbiddenException } from 'src/common/exceptions';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LoginAction } from '../audit-log/entities/login-log.entity';
import type { ClientInfo } from '../../common/decorators/client-info.decorator';
import { randomUUID } from 'crypto';
import {
  RevokedReason,
  UserDevicesService,
} from '../user-devices/user-devices.service';
import { RevokedTokensService } from '../revoked-tokens/revoked-tokens.service';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  permissions: PermissionsMap;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
    private readonly otpService: OtpService,
    private readonly auditLogService: AuditLogService,
    private readonly userDevicesService: UserDevicesService,
    private readonly revokedTokensService: RevokedTokensService,
  ) {}

  // ===== LOGIN =====
  async login(
    dto: LoginDto,
    deviceId: string,
    client: ClientInfo,
  ): Promise<LoginResult> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.username = :username', { username: dto.username })
      .getOne();

    if (!user) {
      void this.auditLogService.recordLogin({
        userId: null,
        username: dto.username,
        action: LoginAction.LOGIN,
        success: false,
        failReason: 'Tài khoản không tồn tại',
        ipAddress: client.ip,
        userAgent: client.userAgent,
        deviceId: client.deviceId,
      });
      throw new UnauthorizedException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Sai tên đăng nhập hoặc mật khẩu',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      void this.auditLogService.recordLogin({
        userId: user.id,
        username: user.username,
        action: LoginAction.LOGIN,
        success: false,
        failReason: 'Sai mật khẩu',
        ipAddress: client.ip,
        userAgent: client.userAgent,
        deviceId: client.deviceId,
      });
      throw new UnauthorizedException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Sai tên đăng nhập hoặc mật khẩu',
      );
    }

    if (user.status === UserStatus.BANNED) {
      void this.auditLogService.recordLogin({
        userId: user.id,
        username: user.username,
        action: LoginAction.LOGIN,
        success: false,
        failReason: 'Tài khoản đã bị khoá',
        ipAddress: client.ip,
        userAgent: client.userAgent,
        deviceId: client.deviceId,
      });
      throw new ForbiddenException(
        ErrorCode.AUTH_ACCOUNT_BANNED,
        'Tài khoản đã bị khoá',
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      void this.auditLogService.recordLogin({
        userId: user.id,
        username: user.username,
        action: LoginAction.LOGIN,
        success: false,
        failReason: 'Tài khoản chưa kích hoạt',
        ipAddress: client.ip,
        userAgent: client.userAgent,
        deviceId: client.deviceId,
      });
      throw new ForbiddenException(
        ErrorCode.AUTH_ACCOUNT_INACTIVE,
        'Tài khoản chưa kích hoạt',
      );
    }

    // ===== Sinh token =====
    // Access token: không có jti (chỉ verify signature)
    // Refresh token: có jti (để check active session khi refresh)
    const jti = randomUUID();
    const accessPayload = {
      sub: user.id,
      username: user.username,
      deviceId,
      jti,
    };
    const refreshPayload = { ...accessPayload };

    const accessSecret = this.config.getOrThrow<string>('jwt.accessSecret');
    const refreshSecret = this.config.getOrThrow<string>('jwt.refreshSecret');
    const accessExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.accessExpiresIn',
    );
    const refreshExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.refreshExpiresIn',
    );

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    // Gom permission của user
    const permissions = await this.getUserPermission(user.id);

    // Upsert session (jti mới, đảm bảo mỗi device chỉ có 1 row active)
    await this.userDevicesService.upsertSession({
      userId: user.id,
      deviceId,
      jti,
      userAgent: client.userAgent,
      ipAddress: client.ip,
    });

    // Ghi login log thành công
    void this.auditLogService.recordLogin({
      userId: user.id,
      username: user.username,
      action: LoginAction.LOGIN,
      success: true,
      ipAddress: client.ip,
      userAgent: client.userAgent,
      deviceId: client.deviceId,
    });

    return { accessToken, refreshToken, permissions };
  }

  // ===== REFRESH =====
  async refresh(
    refreshToken: string,
    deviceId: string,
    client: ClientInfo,
  ): Promise<RefreshResult> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        username: string;
        deviceId: string;
        jti: string;
      }>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });

      if (payload.deviceId !== deviceId) {
        void this.auditLogService.recordLogin({
          userId: payload.sub,
          username: payload.username,
          action: LoginAction.REFRESH,
          success: false,
          failReason: 'Device ID không khớp',
          ipAddress: client.ip,
          userAgent: client.userAgent,
          deviceId: client.deviceId,
        });
        throw new UnauthorizedException(
          ErrorCode.AUTH_TOKEN_INVALID,
          'Device ID không khớp với refresh token',
        );
      }

      // Check session còn active không
      const session = await this.userDevicesService.findActiveByJti(
        payload.sub,
        deviceId,
        payload.jti,
      );
      if (!session) {
        void this.auditLogService.recordLogin({
          userId: payload.sub,
          username: payload.username,
          action: LoginAction.REFRESH,
          success: false,
          failReason: 'Phiên đăng nhập đã bị thu hồi',
          ipAddress: client.ip,
          userAgent: client.userAgent,
          deviceId: client.deviceId,
        });
        throw new UnauthorizedException(
          ErrorCode.AUTH_TOKEN_INVALID,
          'Phiên đăng nhập đã bị thu hồi',
        );
      }

      await this.userDevicesService.touchSession(payload.sub, deviceId);

      const accessSecret = this.config.getOrThrow<string>('jwt.accessSecret');
      const refreshSecret = this.config.getOrThrow<string>('jwt.refreshSecret');
      const accessExpiresIn = this.config.getOrThrow<StringValue>(
        'jwt.accessExpiresIn',
      );
      const refreshExpiresIn = this.config.getOrThrow<StringValue>(
        'jwt.refreshExpiresIn',
      );

      const newAccessToken = await this.jwtService.signAsync(
        {
          sub: payload.sub,
          username: payload.username,
          deviceId,
          jti: payload.jti,
        },
        { secret: accessSecret, expiresIn: accessExpiresIn },
      );

      const newRefreshToken = await this.jwtService.signAsync(
        {
          sub: payload.sub,
          username: payload.username,
          deviceId,
          jti: payload.jti,
        },
        { secret: refreshSecret, expiresIn: refreshExpiresIn },
      );

      void this.auditLogService.recordLogin({
        userId: payload.sub,
        username: payload.username,
        action: LoginAction.REFRESH,
        success: true,
        ipAddress: client.ip,
        userAgent: client.userAgent,
        deviceId: client.deviceId,
      });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  // ===== LOGOUT =====
  async logout(userId: number, deviceId: string): Promise<void> {
    // 1. Update user_devices is_active=0
    const device = await this.userDevicesService.revokeByDevice(
      userId,
      deviceId,
      RevokedReason.LOGOUT,
    );

    // 2. Revoke jti → blacklist access token hiện tại
    if (device?.jti) {
      await this.revokedTokensService.revoke({
        jti: device.jti,
        userId,
        deviceId,
        reason: 'logout',
      });
    }

    // 3. Audit log
    void this.auditLogService.recordLogin({
      userId,
      username: null,
      action: LoginAction.LOGOUT,
      success: true,
      deviceId,
    });
  }

  // ===== FORGOT PASSWORD =====
  async forgotPassword(
    dto: ForgotPasswordDto,
    client: ClientInfo,
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, username: dto.username },
    });

    if (!user) {
      void this.auditLogService.recordLogin({
        userId: null,
        username: null,
        action: LoginAction.FORGOT_PASSWORD,
        success: false,
        failReason: `Không tìm thấy người dùng`,
        ipAddress: client.ip,
        userAgent: client.userAgent,
        deviceId: client.deviceId,
      });
      this.logger.warn(`Forgot password cho email không tồn tại: ${dto.email}`);
      return;
    }

    const otp = await this.otpService.generate(
      user.id,
      OtpPurpose.FORGOT_PASSWORD,
    );

    await this.mailService.sendOtpEmail(user.email, otp, user.username);

    void this.auditLogService.recordLogin({
      userId: user.id,
      username: user.username,
      action: LoginAction.FORGOT_PASSWORD,
      success: true,
      ipAddress: client.ip,
      userAgent: client.userAgent,
      deviceId: client.deviceId,
    });
  }

  // ===== RESET PASSWORD =====
  async resetPassword(
    dto: ResetPasswordDto,
    client: ClientInfo,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user) {
      throw new CoreException(
        ErrorCode.AUTH_OTP_INVALID,
        'OTP không hợp lệ hoặc đã hết hạn',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isValid = await this.otpService.verify(
      user.id,
      OtpPurpose.FORGOT_PASSWORD,
      dto.otp,
    );
    if (!isValid) {
      void this.auditLogService.recordLogin({
        userId: user.id,
        username: user.username,
        action: LoginAction.RESET_PASSWORD,
        success: false,
        failReason: 'OTP không hợp lệ',
        ipAddress: client.ip,
        userAgent: client.userAgent,
        deviceId: client.deviceId,
      });
      throw new CoreException(
        ErrorCode.AUTH_OTP_INVALID,
        'OTP không hợp lệ hoặc đã hết hạn',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(
      { id: user.id },
      {
        password: hashedPassword,
        firstLogin: false,
        passwordChangedAt: new Date(),
        updatedBy: user.id,
      },
    );

    void this.auditLogService.recordLogin({
      userId: user.id,
      username: user.username,
      action: LoginAction.RESET_PASSWORD,
      success: true,
      ipAddress: client.ip,
      userAgent: client.userAgent,
      deviceId: client.deviceId,
    });
    await this.userDevicesService.revokeAllByUser(user.id, 'passwordReset');
  }

  // ===== FIRST CHANGE PASSWORD =====
  async firstChangePassword(
    userId: number,
    dto: FirstChangePasswordDto,
    client: ClientInfo,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(
        ErrorCode.USER_NOT_FOUND,
        'Người dùng không tồn tại',
      );
    }

    if (!user.firstLogin) {
      throw new ForbiddenException(
        ErrorCode.FORBIDDEN,
        'Tài khoản đã đổi mật khẩu lần đầu',
      );
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.passwordChangedAt = new Date();
    user.firstLogin = false;
    user.updatedBy = userId;
    await this.userRepo.save(user);

    await this.userDevicesService.revokeAllByUser(
      user.id,
      RevokedReason.PASSWORD_CHANGE,
    );

    void this.auditLogService.recordLogin({
      userId: user.id,
      username: user.username,
      action: LoginAction.CHANGE_PASSWORD,
      success: true,
      ipAddress: client.ip,
      userAgent: client.userAgent,
      deviceId: client.deviceId,
    });

    return; // 204
  }

  // ===== CHANGE PASSWORD =====
  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
    client: ClientInfo,
  ): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException(
        ErrorCode.USER_NOT_FOUND,
        'Người dùng không tồn tại',
      );
    }

    const isOldMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldMatch) {
      void this.auditLogService.recordLogin({
        userId: user.id,
        username: user.username,
        action: LoginAction.CHANGE_PASSWORD,
        success: false,
        failReason: 'Mật khẩu cũ không đúng',
        ipAddress: client.ip,
        userAgent: client.userAgent,
        deviceId: client.deviceId,
      });
      throw new CoreException(
        ErrorCode.AUTH_OLD_PASSWORD_INCORRECT,
        'Mật khẩu cũ không đúng',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(
      { id: userId },
      {
        password: hashedPassword,
        updatedBy: userId,
        firstLogin: false,
        passwordChangedAt: new Date(),
      },
    );

    await this.userDevicesService.revokeAllByUser(
      userId,
      RevokedReason.PASSWORD_CHANGE,
    );

    void this.auditLogService.recordLogin({
      userId: user.id,
      username: user.username,
      action: LoginAction.CHANGE_PASSWORD,
      success: true,
      ipAddress: client.ip,
      userAgent: client.userAgent,
      deviceId: client.deviceId,
    });
  }

  async getMe(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException(
        ErrorCode.UNAUTHORIZED,
        'Người dùng không tồn tại',
      );
    }
    const permissions = await this.getUserPermission(userId);

    return {
      user,
      permissions,
      firstLogin: user.firstLogin,
    };
  }

  async buildAuthUser(userId: number, deviceId: string): Promise<AuthUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { role: true },
    });
    if (!user) {
      throw new UnauthorizedException(
        ErrorCode.UNAUTHORIZED,
        'Người dùng không tồn tại',
      );
    }
    const permissions = await this.getUserPermission(userId);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      deviceId,
      avatarUrl: user.avatarUrl,
      role: user.role?.name,
      permissions,
      firstLogin: user.firstLogin,
    };
  }

  private async getUserPermission(userId: number): Promise<PermissionsMap> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, roleId: true },
    });
    if (!user?.roleId) return {};

    const rolePerms = await this.rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.permission', 'p')
      .where('rp.roleId = :roleId', { roleId: user.roleId })
      .getMany();

    const map: PermissionsMap = {};
    for (const rp of rolePerms) {
      const { moduleKey, action } = rp.permission;
      if (!map[moduleKey]) map[moduleKey] = [];
      if (!map[moduleKey].includes(action)) map[moduleKey].push(action);
    }

    return map;
  }
}
export type { PermissionsMap };
