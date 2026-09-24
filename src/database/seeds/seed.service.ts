import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Permission } from '../../modules/permissions/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';
import { RolePermission } from '../../modules/role-permissions/entities/role-permission.entity';
import { UserRole } from '../../modules/user-roles/entities/user-role.entity';

import { DEFAULT_PERMISSIONS } from './data/permissions.data';
import { DEFAULT_ROLES, DEFAULT_ADMIN_USER } from './data/roles.data';

/**
 * Seed data chạy 1 lần khi app start.
 * Idempotent: chạy nhiều lần không tạo duplicate.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const hasAdmin = await this.userRepo.findOne({
      where: { username: DEFAULT_ADMIN_USER.username },
    });

    if (hasAdmin) {
      this.logger.log('✅ Seed skipped — admin user already exists');
      return;
    }

    this.logger.log('🌱 Seeding database...');

    await this.dataSource.transaction(async (manager) => {
      // ===== 1. Permissions =====
      const permissions = await manager.save(
        Permission,
        DEFAULT_PERMISSIONS.map((p) => manager.create(Permission, p)),
      );

      // ===== 2. Role admin =====
      const adminRole = await manager.save(
        Role,
        manager.create(Role, DEFAULT_ROLES[0]),
      );

      // ===== 3. Gán hết permission cho role admin =====
      await manager.save(
        RolePermission,
        permissions.map((p) =>
          manager.create(RolePermission, {
            roleId: adminRole.id,
            permissionId: p.id,
          }),
        ),
      );

      // ===== 4. User admin =====
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_USER.password, 10);
      const adminUser = await manager.save(
        User,
        manager.create(User, {
          username: DEFAULT_ADMIN_USER.username,
          email: DEFAULT_ADMIN_USER.email,
          password: hashedPassword,
        }),
      );

      // ===== 5. Gán role admin cho user admin =====
      await manager.save(
        UserRole,
        manager.create(UserRole, {
          userId: adminUser.id,
          roleId: adminRole.id,
        }),
      );
    });

    this.logger.log(
      `✅ Seed done — login with: ${DEFAULT_ADMIN_USER.username} / ${DEFAULT_ADMIN_USER.password}`,
    );
  }
}
