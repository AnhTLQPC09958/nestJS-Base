import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Permission } from '../../modules/permissions/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';
import { RolePermission } from '../../modules/role-permissions/entities/role-permission.entity';

import { DEFAULT_PERMISSIONS } from './data/permissions.data';
import { DEFAULT_ROLES, DEFAULT_ADMIN_USER } from './data/roles.data';

/**
 * Seed data chạy khi app bootstrap.
 * Idempotent & Tự động cập nhật:
 *  - Tự động nạp thêm quyền mới vào DB nếu code bổ sung thêm permission.
 *  - Tự động gán các quyền mới đó cho vai trò Admin hệ thống.
 *  - Khởi tạo vai trò Admin và tài khoản Admin mặc định nếu chưa tồn tại.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.seedPermissionsAndAdmin();
    } catch (error) {
      this.logger.error('❌ Lỗi trong quá trình seed dữ liệu:', (error as Error).stack);
    }
  }

  private async seedPermissionsAndAdmin(): Promise<void> {
    // ===== 1. Upsert Permissions =====
    const existingPerms = await this.permissionRepo.find();
    const existingKeySet = new Set(
      existingPerms.map((p) => `${p.moduleKey}:${p.action}`),
    );

    const newPermissionsToInsert = DEFAULT_PERMISSIONS.filter(
      (p) => !existingKeySet.has(`${p.moduleKey}:${p.action}`),
    );

    if (newPermissionsToInsert.length > 0) {
      await this.permissionRepo.save(
        newPermissionsToInsert.map((p) => this.permissionRepo.create(p)),
      );
      this.logger.log(
        `🌱 Đã bổ sung ${newPermissionsToInsert.length} quyền mới vào database`,
      );
    }

    const allPermissions = await this.permissionRepo.find();

    // ===== 2. Role admin =====
    let adminRole = await this.roleRepo.findOne({
      where: { name: DEFAULT_ROLES[0].name },
    });

    if (!adminRole) {
      adminRole = await this.roleRepo.save(
        this.roleRepo.create({
          ...DEFAULT_ROLES[0],
          isSystem: true,
        }),
      );
      this.logger.log(`🌱 Đã khởi tạo vai trò quản trị: ${adminRole.name}`);
    } else if (!adminRole.isSystem) {
      await this.roleRepo.update(adminRole.id, { isSystem: true });
    }

    // ===== 3. Gán quyền đầy đủ cho Role Admin =====
    const currentAdminRolePerms = await this.rolePermissionRepo.find({
      where: { roleId: adminRole.id },
      select: { permissionId: true },
    });
    const assignedPermIds = new Set(
      currentAdminRolePerms.map((rp) => rp.permissionId),
    );

    const missingPermsForAdmin = allPermissions.filter(
      (p) => !assignedPermIds.has(p.id),
    );

    if (missingPermsForAdmin.length > 0) {
      await this.rolePermissionRepo.save(
        missingPermsForAdmin.map((p) =>
          this.rolePermissionRepo.create({
            roleId: adminRole.id,
            permissionId: p.id,
          }),
        ),
      );
      this.logger.log(
        `🌱 Đã đồng bộ thêm ${missingPermsForAdmin.length} quyền cho vai trò ${adminRole.name}`,
      );
    }

    // ===== 4. User admin =====
    const hasAdmin = await this.userRepo.findOne({
      where: { username: DEFAULT_ADMIN_USER.username },
    });

    if (!hasAdmin) {
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_USER.password, 10);
      await this.userRepo.save(
        this.userRepo.create({
          username: DEFAULT_ADMIN_USER.username,
          email: DEFAULT_ADMIN_USER.email,
          password: hashedPassword,
          roleId: adminRole.id,
        }),
      );
      this.logger.log(
        `✅ Khởi tạo tài khoản Admin thành công: ${DEFAULT_ADMIN_USER.username} / ${DEFAULT_ADMIN_USER.password}`,
      );
    } else {
      this.logger.log('✅ Seed dữ liệu quyền và quản trị viên đã sẵn sàng');
    }
  }
}
