import { Role } from '../entities/role.entity';

export class RoleResponseDto {
  id!: number;
  name!: string;
  description?: string;
  createdBy!: number | null;
  updatedBy!: number | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(role: Role): RoleResponseDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdBy: role.createdBy,
      updatedBy: role.updatedBy,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}

export class RoleOptionDto {
  id!: number;
  name!: string;

  static fromEntity(role: Role): RoleOptionDto {
    return { id: role.id, name: role.name };
  }
}

export class RolePermissionsResponseDto {
  roleId!: number;
  permissionIds!: number[];
}
