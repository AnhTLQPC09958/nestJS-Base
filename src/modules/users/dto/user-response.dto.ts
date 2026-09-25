import { User, UserStatus } from '../entities/user.entity';

export class UserResponseDto {
  id!: number;
  username!: string;
  email!: string;
  avatarUrl?: string;
  status!: UserStatus;
  createdBy!: number | null;
  updatedBy!: number | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      status: user.status,
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
