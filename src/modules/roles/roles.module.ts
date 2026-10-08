import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, RolePermission, Permission, User]),
    RolePermissionsModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule {}
