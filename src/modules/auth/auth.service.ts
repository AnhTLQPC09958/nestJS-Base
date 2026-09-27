import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';
import { ConfigService } from '@nestjs/config';
import {
  ChangePasswordDto,
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
import { CoreException } from 'src/common/exceptions';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  permissions: PermissionsMap;
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
  ) {}

  //   ===== LOGIN =====
  async login(dto: LoginDto, deviceId: string): Promise<LoginResult> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.username = :username', { username: dto.username })
      .getOne();

    if (!user) {
      throw new UnauthorizedException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Sai tên đăng nhập hoặc mật khẩu',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Sai tên đăng nhập hoặc mật khẩu',
      );
    }

    // ===== Sinh token =====
    const payload = { sub: user.id, username: user.username, deviceId };
    const accessSecret = this.config.getOrThrow<string>('jwt.accessSecret');
    const refreshSecret = this.config.getOrThrow<string>('jwt.refreshSecret');
    const accessExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.accessExpiresIn',
    );
    const refreshExpiresIn = this.config.getOrThrow<StringValue>(
      'jwt.refreshExpiresIn',
    );

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    // Gom permission của user
    const permissions = await this.getUserPermission(user.id);

    return { accessToken, refreshToken, permissions };
  }

  async refresh(
    refreshToken: string,
    deviceId: string,
  ): Promise<{ accessToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        username: string;
        deviceId: string;
      }>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });

      if (payload.deviceId !== deviceId) {
        throw new UnauthorizedException(
          ErrorCode.AUTH_TOKEN_INVALID,
          'Device ID không khớp với refresh token',
        );
      }
      const accessSecret = this.config.getOrThrow<string>('jwt.accessSecret');
      const accessExpiresIn = this.config.getOrThrow<StringValue>(
        'jwt.accessExpiresIn',
      );

      const accessToken = await this.jwtService.signAsync(
        { sub: payload.sub, username: payload.username, deviceId },
        {
          secret: accessSecret,
          expiresIn: accessExpiresIn,
        },
      );

      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // ⚠️ Không leak email existence — silent return nếu không tìm thấy
    if (!user) {
      this.logger.warn(`Forgot password cho email không tồn tại: ${dto.email}`);
      return;
    }

    const otp = await this.otpService.generate(
      user.id,
      OtpPurpose.FORGOT_PASSWORD,
    );

    await this.mailService.sendOtpEmail(user.email, otp, user.username);
  }

  // ===== RESET PASSWORD =====
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // Trả lỗi generic — không tiết lộ email có tồn tại
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
      throw new CoreException(
        ErrorCode.AUTH_OTP_INVALID,
        'OTP không hợp lệ hoặc đã hết hạn',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update({ id: user.id }, { password: hashedPassword });

    this.logger.log(`🔑 Password reset thành công cho user ${user.id}`);
  }

  // ===== CHANGE PASSWORD =====
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
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
      throw new CoreException(
        ErrorCode.AUTH_OLD_PASSWORD_INCORRECT,
        'Mật khẩu cũ không đúng',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(
      { id: userId },
      { password: hashedPassword, updatedBy: userId },
    );

    this.logger.log(`🔑 User ${userId} đổi mật khẩu thành công`);
  }

  async getMe(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException(
        ErrorCode.UNAUTHORIZED,
        'Người dùng không tồn tại',
      );
    }
    const permissions = await this.getUserPermission(userId);

    return { user, permissions };
  }

  /**
   * Build AuthUser cho JwtStrategy.
   * Chỉ lấy field cần thiết — KHÔNG trả password.
   */
  async buildAuthUser(userId: number, deviceId: string): Promise<AuthUser> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
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
      permissions,
    };
  }

  //   ===== gom permission theo module key =====
  private async getUserPermission(userId: number): Promise<PermissionsMap> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, roleId: true },
    });
    if (!user?.roleId) return {};

    const rolePerms = await this.rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.permission', 'p')
      .where('rp.role_id = :roleId', { roleId: user.roleId })
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
