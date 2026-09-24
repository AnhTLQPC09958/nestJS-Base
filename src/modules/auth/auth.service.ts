import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { ErrorCode } from 'src/common/constants';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { AuthUser, PermissionsMap } from 'src/common/types';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  permissions: PermissionsMap;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  //   ===== LOGIN =====
  async login(dto: LoginDto): Promise<LoginResult> {
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
    const payload = { sub: user.id, username: user.username };
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

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        username: string;
      }>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });

      const accessSecret = this.config.getOrThrow<string>('jwt.accessSecret');
      const accessExpiresIn = this.config.getOrThrow<StringValue>(
        'jwt.accessExpiresIn',
      );

      const accessToken = await this.jwtService.signAsync(
        { sub: payload.sub, username: payload.username },
        {
          secret: accessSecret,
          expiresIn: accessExpiresIn,
        },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException(
        ErrorCode.AUTH_TOKEN_INVALID,
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
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
  async buildAuthUser(userId: number): Promise<AuthUser> {
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
      permissions,
    };
  }

  //   ===== gom permission theo module key =====
  private async getUserPermission(userId: number): Promise<PermissionsMap> {
    const userRoles = await this.userRoleRepo.find({
      where: { userId },
      select: { roleId: true },
    });
    if (userRoles.length === 0) return {};

    const roleIds = userRoles.map((ur) => ur.roleId);

    const rolePerms = await this.rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.permission', 'p')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
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
