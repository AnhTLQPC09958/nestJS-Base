import { User, UserStatus } from '../entities/user.entity';
import { RoleOptionDto } from '../../roles/dto/role-response.dto';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  id!: number;
  username!: string;
  email!: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status!: UserStatus;
  roleId!: number | null;
  role!: RoleOptionDto | null;
  createdBy!: number | null;
  updatedBy!: number | null;
  createdAt!: Date;
  updatedAt!: Date;
  @Expose()
  firstLogin!: boolean;
  @Expose()
  passwordChangedAt!: Date | null;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      status: user.status,
      firstLogin: user.firstLogin,
      passwordChangedAt: user.passwordChangedAt ?? null,
      roleId: user.roleId,
      role: user.role ? RoleOptionDto.fromEntity(user.role) : null,
      createdBy: user.createdBy,
      updatedBy: user.updatedBy,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export class UserOptionDto {
  id!: number;
  username!: string;
  email!: string;

  static fromEntity(user: User): UserOptionDto {
    return { id: user.id, username: user.username, email: user.email };
  }
}
