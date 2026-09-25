import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role, RolePermission])],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService, TypeOrmModule],
})
export class PermissionsModule {}
