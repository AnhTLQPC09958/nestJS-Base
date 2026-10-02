import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('revoked_tokens')
@Index(['jti'], { unique: true })
@Index(['expiresAt'])
export class RevokedToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  jti!: string;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @Column({ name: 'device_id', type: 'varchar', length: 100, nullable: true })
  deviceId!: string | null;

  /** = thời điểm access token hết hạn (login + accessTTL) */
  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  /** 'logout' | 'admin_revoke' | 'force_logout' */
  @Column({
    name: 'revoked_reason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  revokedReason!: string | null;

  @CreateDateColumn({ name: 'revoked_at' })
  revokedAt!: Date;
}
