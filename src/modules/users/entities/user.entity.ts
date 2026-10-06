import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../database/entities';
import { Role } from '../../roles/entities/role.entity';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BANNED = 'BANNED',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true, length: 100 })
  username!: string;

  @Column({ nullable: true, length: 20 })
  phone?: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ select: false, length: 255 })
  password!: string;

  @Column({ name: 'avatar_url', nullable: true, length: 500 })
  avatarUrl?: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ name: 'first_login', type: 'boolean', default: false })
  firstLogin!: boolean;

  @Column({ name: 'password_changed_at', type: 'datetime', nullable: true })
  passwordChangedAt?: Date | null;

  @Column({ name: 'role_id', type: 'int', nullable: true })
  roleId!: number | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'role_id' })
  role!: Role | null;
}
