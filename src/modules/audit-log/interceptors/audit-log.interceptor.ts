import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';

import { AuditLogService } from '../audit-log.service';
import {
  AUDIT_LOG_KEY,
  type AuditLogMetadata,
} from '../decorators/audit-log.decorator';
import { maskSensitive } from '../utils/mask-sensitive.util';
import { getClientIp } from '../utils/get-client-ip.util';
import type { AuthUser } from '../../../common/types';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as Request & { user?: AuthUser }).user;

    return next.handle().pipe(
      tap({
        next: (data) => {
          void this.writeLog(req, user, meta, data, null);
        },
        error: (err) => {
          void this.writeLog(req, user, meta, null, err);
        },
      }),
    );
  }

  private async writeLog(
    req: Request,
    user: AuthUser | undefined,
    meta: AuditLogMetadata,
    responseData: unknown,
    error: unknown,
  ): Promise<void> {
    try {
      const statusCode = error
        ? ((error as { status?: number })?.status ?? 500)
        : 201;

      // entity_id: ưu tiên response.id, fallback param :id
      const entityId =
        (responseData as { id?: number } | null)?.id ??
        (req.params?.id ? Number(req.params.id) : null);

      await this.auditLogService.record({
        userId: user?.id ?? null,
        username: user?.username ?? null,
        action: meta.action,
        moduleKey: meta.module,
        description: meta.description,
        endpoint: req.originalUrl,
        method: req.method,
        entityId: Number.isFinite(entityId) ? entityId : null,
        payload: maskSensitive(req.body) as Record<string, unknown> | null,
        ipAddress: getClientIp(req),
        userAgent: (req.headers['user-agent'] as string) ?? null,
        statusCode,
      });
    } catch (logErr) {
      // KHÔNG throw — lỗi ghi log không được làm hỏng response cho user
      this.logger.error(
        `Ghi audit log thất bại: ${(logErr as Error).message}`,
        (logErr as Error).stack,
      );
    }
  }
}
