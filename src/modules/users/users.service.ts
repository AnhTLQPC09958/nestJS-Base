import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { PaginatedResponse } from 'src/common/types';
import {
  CreateUserDto,
  UpdateUserDto,
  UserOptionDto,
  UserResponseDto,
} from './dto';
import { ErrorCode } from 'src/common/constants';
import { CoreException, NotFoundException } from 'src/common/exceptions';
import * as bcrypt from 'bcrypt';
import { toPaginatedResponse } from '../../common/utils';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
  ) {}

  async findAll(
    query: PaginateQuery,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const result = await paginate<User>(query, this.userRepo, {
      sortableColumns: ['id', 'username', 'email', 'status', 'createdAt'],
      searchableColumns: ['username', 'email'],
      defaultSortBy: [['id', 'DESC']],
      defaultLimit: 20,
      maxLimit: 100,
      filterableColumns: {
        username: [FilterOperator.ILIKE],
        email: [FilterOperator.ILIKE],
        status: [FilterOperator.EQ, FilterOperator.IN],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
    });

    return toPaginatedResponse(result, UserResponseDto.fromEntity);
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(
        ErrorCode.USER_NOT_FOUND,
        'Người dùng không tồn tại',
      );
    }

    return UserResponseDto.fromEntity(user);
  }

  async getOptions(): Promise<UserOptionDto[]> {
    const users = await this.userRepo.find({
      order: { username: 'ASC' },
      select: { id: true, username: true, email: true },
    });

    return users.map(UserOptionDto.fromEntity);
  }

  async create(dto: CreateUserDto, actorId: number): Promise<UserResponseDto> {
    await this.ensureUnique(dto.username, dto.email);

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userRepo.manager.transaction(async (manager) => {
      const created = await manager.save(
        User,
        manager.create(User, {
          username: dto.username,
          email: dto.email,
          password: hashedPassword,
          avatarUrl: dto.avatarUrl,
          status: dto.status,
          createdBy: actorId,
          updatedBy: actorId,
        }),
      );

      if (dto.roleIds && dto.roleIds.length > 0) {
        await manager.save(
          UserRole,
          dto.roleIds.map((roleId) =>
            manager.create(UserRole, {
              userId: created.id,
              roleId,
              createdBy: actorId,
              updatedBy: actorId,
            }),
          ),
        );
      }

      return created;
    });
    return UserResponseDto.fromEntity(user);
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    actorId: number,
  ): Promise<UserResponseDto> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(
        ErrorCode.USER_NOT_FOUND,
        'Người dùng không tồn tại',
      );
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (exists) {
        throw new CoreException(
          ErrorCode.USER_EMAIL_DUPLICATED,
          'Email đã tồn tại',
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.userRepo.manager.transaction(async (manager) => {
      // Cập nhật field cơ bản
      Object.assign(user, {
        username: dto.username ?? user.username,
        email: dto.email ?? user.email,
        avatarUrl: dto.avatarUrl ?? user.avatarUrl,
        status: dto.status ?? user.status,
        updatedBy: actorId,
      });
      const saved = await manager.save(user);

      // Cập nhật roles (nếu client gửi roleIds)
      if (dto.roleIds) {
        await manager.delete(UserRole, { userId: id });
        if (dto.roleIds.length > 0) {
          await manager.save(
            UserRole,
            dto.roleIds.map((roleId) =>
              manager.create(UserRole, {
                userId: id,
                roleId,
                createdBy: actorId,
                updatedBy: actorId,
              }),
            ),
          );
        }
      }

      return saved;
    });

    return UserResponseDto.fromEntity(updated);
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(
        ErrorCode.USER_NOT_FOUND,
        'Người dùng không tồn tại',
      );
    }
    await this.userRepo.remove(user);
  }

  private async ensureUnique(username: string, email: string): Promise<void> {
    const existing = await this.userRepo.findOne({
      where: [{ username }, { email }],
    });
    if (existing) {
      if (existing.username === username) {
        throw new CoreException(
          ErrorCode.USER_USERNAME_DUPLICATED,
          'Tên đăng nhập đã tồn tại',
          HttpStatus.CONFLICT,
        );
      }
      throw new CoreException(
        ErrorCode.USER_EMAIL_DUPLICATED,
        'Email đã tồn tại',
        HttpStatus.CONFLICT,
      );
    }
  }
}
