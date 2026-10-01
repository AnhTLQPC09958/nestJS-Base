import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_devices')
@Index(['userId', 'deviceId'], { unique: true })
@Index(['jti'])
@Index(['isActive'])
@Index(['lastActiveAt'])
export class UserDevice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'device_id', type: 'varchar', length: 100 })
  deviceId!: string;

  /** JWT ID — unique per session, dùng để check active khi refresh */
  @Column({ type: 'varchar', length: 100, nullable: true })
  jti!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'last_active_at', type: 'datetime', nullable: true })
  lastActiveAt!: Date | null;

  /** Thời điểm refresh token hết hạn (login + 7d) */
  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt!: Date | null;

  /** 'logout' | 'force_logout' | 'admin_revoke' | 'expired' */
  @Column({
    name: 'revoked_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  revokedReason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
