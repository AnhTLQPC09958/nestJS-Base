import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit-log:meta';

export interface AuditLogMetadata {
  /** 'create' | 'update' | 'delete' | 'export' */
  action: string;
  /** moduleKey kebab-case */
  module: string;
  /** Mô tả hiển thị tiếng Việt */
  description: string;
}

/**
 * Đánh dấu endpoint cần audit log.
 * AuditLogInterceptor đọc metadata này để insert row.
 *
 * @example
 *   @Post()
 *   @AuditLog({ action: 'create', module: 'nguoi-dung', description: 'Tạo mới người dùng' })
 *   create(...) {}
 */
export const AuditLog = (meta: AuditLogMetadata) =>
  SetMetadata(AUDIT_LOG_KEY, meta);
