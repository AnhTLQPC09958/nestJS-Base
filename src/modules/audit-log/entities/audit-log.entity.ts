import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
@Index(['userId'])
@Index(['moduleKey'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Nullable cho system action (cron, seed...) */
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username!: string | null;

  /** 'create' | 'update' | 'delete' | 'export' — khớp PermissionAction */
  @Column({ type: 'varchar', length: 50 })
  action!: string;

  /** moduleKey kebab-case: 'nguoi-dung', 'vai-tro' */
  @Column({ name: 'module_key', type: 'varchar', length: 100 })
  moduleKey!: string;

  /** Mô tả hiển thị: 'Tạo mới người dùng' */
  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  endpoint!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method!: string | null;

  /** ID của record bị tác động. Nullable cho các action không có entity cụ thể. */
  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId!: number | null;

  /** Request body đã mask sensitive fields. */
  @Column({ type: 'json', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
