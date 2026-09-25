import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';

import { Role } from './entities/role.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import {
  RoleResponseDto,
  RoleOptionDto,
  RolePermissionsResponseDto,
} from './dto/role-response.dto';
import { ErrorCode } from '../../common/constants';
import { CoreException, NotFoundException } from '../../common/exceptions';
import { PaginatedResponse } from '../../common/types';
import { toPaginatedResponse } from '../../common/utils';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';
import { Permission } from '../permissions/entities/permission.entity';
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async findAll(
    query: PaginateQuery,
  ): Promise<PaginatedResponse<RoleResponseDto>> {
    const result = await paginate<Role>(query, this.roleRepo, {
      sortableColumns: ['id', 'name', 'createdAt'],
      searchableColumns: ['name', 'description'],
      defaultSortBy: [['id', 'ASC']],
      defaultLimit: 20,
      maxLimit: 100,
      filterableColumns: {
        name: [FilterOperator.ILIKE],
      },
    });

    return toPaginatedResponse(result, RoleResponseDto.fromEntity);
  }

  async findOne(id: number): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(
        ErrorCode.ROLE_NOT_FOUND,
        'Vai trò không tồn tại',
      );
    }

    return RoleResponseDto.fromEntity(role);
  }

  async getOptions(): Promise<RoleOptionDto[]> {
    const roles = await this.roleRepo.find({
      order: { name: 'ASC' },
      select: { id: true, name: true },
    });
    return roles.map(RoleOptionDto.fromEntity);
  }

  async create(dto: CreateRoleDto, actorId: number): Promise<RoleResponseDto> {
    await this.ensureUniqueName(dto.name);

    const role = await this.roleRepo.save(
      this.roleRepo.create({
        name: dto.name,
        description: dto.description,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );

    return RoleResponseDto.fromEntity(role);
  }

  async update(
    id: number,
    dto: UpdateRoleDto,
    actorId: number,
  ): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(
        ErrorCode.ROLE_NOT_FOUND,
        'Vai trò không tồn tại',
      );
    }

    Object.assign(role, {
      description: dto.description ?? role.description,
      updatedBy: actorId,
    });

    const saved = await this.roleRepo.save(role);
    return RoleResponseDto.fromEntity(saved);
  }

  async remove(id: number): Promise<void> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(
        ErrorCode.ROLE_NOT_FOUND,
        'Vai trò không tồn tại',
      );
    }
    await this.roleRepo.remove(role);
  }

  // ============ GET ROLE PERMISSIONS ============
  async getRolePermissions(id: number): Promise<RolePermissionsResponseDto> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(
        ErrorCode.ROLE_NOT_FOUND,
        'Vai trò không tồn tại',
      );
    }

    const rolePerms = await this.rolePermissionRepo.find({
      where: { roleId: id },
      select: { permissionId: true },
    });

    return {
      roleId: id,
      permissionIds: rolePerms.map((rp) => rp.permissionId),
    };
  }

  // ============ ASSIGN PERMISSIONS (replace all) ============
  async assignPermissions(
    id: number,
    permissionIds: number[],
    actorId: number,
  ): Promise<RolePermissionsResponseDto> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(
        ErrorCode.ROLE_NOT_FOUND,
        'Vai trò không tồn tại',
      );
    }

    // Validate tất cả permissionIds đều tồn tại
    if (permissionIds.length > 0) {
      const found = await this.permissionRepo.find({
        where: { id: In(permissionIds) },
        select: { id: true },
      });
      if (found.length !== permissionIds.length) {
        const foundIds = new Set(found.map((p) => p.id));
        const missing = permissionIds.filter((pid) => !foundIds.has(pid));
        throw new CoreException(
          ErrorCode.VALIDATION_FAILED,
          `Permission không tồn tại: ${missing.join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Transaction: xóa hết → insert lại
    await this.roleRepo.manager.transaction(async (manager) => {
      await manager.delete(RolePermission, { roleId: id });

      if (permissionIds.length > 0) {
        await manager.save(
          RolePermission,
          permissionIds.map((permissionId) =>
            manager.create(RolePermission, {
              roleId: id,
              permissionId,
              createdBy: actorId,
              updatedBy: actorId,
            }),
          ),
        );
      }
    });

    return { roleId: id, permissionIds };
  }

  private async ensureUniqueName(name: string): Promise<void> {
    const existing = await this.roleRepo.findOne({ where: { name } });
    if (existing) {
      throw new CoreException(
        ErrorCode.ROLE_NAME_DUPLICATED,
        'Tên vai trò đã tồn tại',
        HttpStatus.CONFLICT,
      );
    }
  }
}
