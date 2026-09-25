import { PermissionAction } from 'src/common/constants';
import { Permission } from '../entities/permission.entity';

export class PermissionItemDto {
  id!: number;
  action!: PermissionAction;

  static fromEntity(p: Permission): PermissionItemDto {
    return { id: p.id, action: p.action };
  }
}

export class PermissionGroupedDto {
  moduleKey!: string;
  permissions!: PermissionItemDto[];

  static fromList(list: Permission[]): PermissionGroupedDto[] {
    const map = new Map<string, PermissionItemDto[]>();
    for (const p of list) {
      if (!map.has(p.moduleKey)) map.set(p.moduleKey, []);
      map.get(p.moduleKey)!.push(PermissionItemDto.fromEntity(p));
    }
    return Array.from(map.entries()).map(([moduleKey, permissions]) => ({
      moduleKey,
      permissions,
    }));
  }
}
