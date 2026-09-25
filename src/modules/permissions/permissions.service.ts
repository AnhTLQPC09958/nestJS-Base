import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Repository } from 'typeorm';
import { PermissionGroupedDto } from './dto';
import { Role } from '../roles/entities/role.entity';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async findAllGrouped(): Promise<PermissionGroupedDto[]> {
    const permissions = await this.permissionRepo.find({
      order: { moduleKey: 'ASC', action: 'ASC' },
    });

    return PermissionGroupedDto.fromList(permissions);
  }
}
