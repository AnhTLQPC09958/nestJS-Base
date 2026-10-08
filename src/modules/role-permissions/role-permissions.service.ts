import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from './entities/role-permission.entity';
import type { PermissionsMap } from '../../common/types';

interface CachedRolePermissions {
  permissions: PermissionsMap;
  expiresAt: number;
}

@Injectable()
export class RolePermissionsService {
  private readonly logger = new Logger(RolePermissionsService.name);
  private readonly cache = new Map<number, CachedRolePermissions>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 phút

  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
  ) {}

  /**
   * Lấy permissions map theo roleId có in-memory caching.
   * Giảm thiểu 100% câu query permissions lặp lại trên mỗi request API.
   */
  async getPermissionsByRoleId(roleId: number): Promise<PermissionsMap> {
    const now = Date.now();
    const cached = this.cache.get(roleId);

    if (cached && cached.expiresAt > now) {
      return cached.permissions;
    }

    const rolePerms = await this.rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoinAndSelect('rp.permission', 'p')
      .where('rp.roleId = :roleId', { roleId })
      .getMany();

    const map: PermissionsMap = {};
    for (const rp of rolePerms) {
      const { moduleKey, action } = rp.permission;
      if (!map[moduleKey]) map[moduleKey] = [];
      if (!map[moduleKey].includes(action)) map[moduleKey].push(action);
    }

    this.cache.set(roleId, {
      permissions: map,
      expiresAt: now + this.TTL_MS,
    });

    return map;
  }

  /**
   * Xóa cache permissions của một role (khi phân quyền lại) hoặc xóa toàn bộ.
   */
  clearCache(roleId?: number): void {
    if (roleId !== undefined) {
      this.cache.delete(roleId);
      this.logger.log(`🧹 Đã xóa cache permissions cho roleId: ${roleId}`);
    } else {
      this.cache.clear();
      this.logger.log(`🧹 Đã làm sạch toàn bộ cache permissions`);
    }
  }
}
