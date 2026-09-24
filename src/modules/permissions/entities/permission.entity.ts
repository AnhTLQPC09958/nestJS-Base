import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../database/entities';
import { PermissionAction } from '../../../common/constants';

@Entity('permissions')
@Index(['moduleKey', 'action'], { unique: true })
export class Permission extends BaseEntity {
  @Column({ name: 'module_key', length: 100 })
  moduleKey!: string;

  @Column({ type: 'enum', enum: PermissionAction })
  action!: PermissionAction;
}
