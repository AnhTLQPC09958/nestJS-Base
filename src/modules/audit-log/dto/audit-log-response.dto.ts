import { AuditLog } from '../entities/audit-log.entity';
import { LoginLog } from '../entities/login-log.entity';

export class AuditLogResponseDto {
  id!: number;
  userId!: number | null;
  username!: string | null;
  action!: string;
  moduleKey!: string;
  description!: string | null;
  endpoint!: string | null;
  method!: string | null;
  entityId!: number | null;
  payload!: Record<string, unknown> | null;
  ipAddress!: string | null;
  userAgent!: string | null;
  statusCode!: number | null;
  createdAt!: Date;

  static fromEntity(e: AuditLog): AuditLogResponseDto {
    return {
      id: e.id,
      userId: e.userId,
      username: e.username,
      action: e.action,
      moduleKey: e.moduleKey,
      description: e.description,
      endpoint: e.endpoint,
      method: e.method,
      entityId: e.entityId,
      payload: e.payload,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      statusCode: e.statusCode,
      createdAt: e.createdAt,
    };
  }
}

export class LoginLogResponseDto {
  id!: number;
  userId!: number | null;
  username!: string | null;
  action!: string;
  success!: boolean;
  failReason!: string | null;
  ipAddress!: string | null;
  userAgent!: string | null;
  deviceId!: string | null;
  createdAt!: Date;

  static fromEntity(e: LoginLog): LoginLogResponseDto {
    return {
      id: e.id,
      userId: e.userId,
      username: e.username,
      action: e.action,
      success: e.success,
      failReason: e.failReason,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      deviceId: e.deviceId,
      createdAt: e.createdAt,
    };
  }
}
