import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum LoginAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REFRESH = 'refresh',
  FORGOT_PASSWORD = 'forgot_password',
  RESET_PASSWORD = 'reset_password',
  CHANGE_PASSWORD = 'change_password',
}

@Entity('login_logs')
@Index(['userId'])
@Index(['username'])
@Index(['action'])
@Index(['createdAt'])
export class LoginLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username!: string | null;

  @Column({ type: 'enum', enum: LoginAction })
  action!: LoginAction;

  @Column({ type: 'boolean', default: false })
  success!: boolean;

  /** Lý do fail: 'Sai mật khẩu', 'OTP hết hạn'... Nullable khi success. */
  @Column({ name: 'fail_reason', type: 'varchar', length: 255, nullable: true })
  failReason!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'device_id', type: 'varchar', length: 100, nullable: true })
  deviceId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
