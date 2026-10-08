import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../database/entities';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ unique: true, length: 100 })
  name!: string;

  @Column({ nullable: true, length: 255 })
  description?: string;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;
}
