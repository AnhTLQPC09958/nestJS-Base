import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';

import { AuditLog } from './entities/audit-log.entity';
import { LoginAction, LoginLog } from './entities/login-log.entity';
import {
  AuditLogResponseDto,
  LoginLogResponseDto,
} from './dto/audit-log-response.dto';
import { PaginatedResponse } from '../../common/types';
import { toPaginatedResponse } from '../../common/utils';

export interface RecordAuditParams {
  userId: number | null;
  username: string | null;
  action: string;
  moduleKey: string;
  description: string | null;
  endpoint: string | null;
  method: string | null;
  entityId: number | null;
  payload: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  statusCode: number | null;
}

export interface RecordLoginParams {
  userId: number | null;
  username: string | null;
  action: LoginAction;
  success: boolean;
  failReason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
}

const RETENTION_DAYS = 60;
const BATCH_SIZE = 1000;
const BATCH_DELAY_MS = 100;

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(LoginLog)
    private readonly loginRepo: Repository<LoginLog>,
  ) {}

  async record(params: RecordAuditParams): Promise<void> {
    await this.auditRepo.insert(params);
  }

  async recordLogin(params: RecordLoginParams): Promise<void> {
    await this.loginRepo.insert({
      userId: params.userId,
      username: params.username,
      action: params.action,
      success: params.success,
      failReason: params.failReason ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      deviceId: params.deviceId ?? null,
    });
  }

  async findAll(
    query: PaginateQuery,
  ): Promise<PaginatedResponse<AuditLogResponseDto>> {
    const result = await paginate<AuditLog>(query, this.auditRepo, {
      sortableColumns: ['id', 'createdAt', 'action', 'moduleKey'],
      searchableColumns: ['username', 'description', 'endpoint'],
      defaultSortBy: [['id', 'DESC']],
      defaultLimit: 20,
      maxLimit: 100,
      filterableColumns: {
        username: [FilterOperator.ILIKE],
        action: [FilterOperator.EQ, FilterOperator.IN],
        moduleKey: [FilterOperator.EQ, FilterOperator.IN],
        userId: [FilterOperator.EQ],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
    });

    return toPaginatedResponse(result, (item) =>
      AuditLogResponseDto.fromEntity(item),
    );
  }

  async findLoginLogs(
    query: PaginateQuery,
  ): Promise<PaginatedResponse<LoginLogResponseDto>> {
    const result = await paginate<LoginLog>(query, this.loginRepo, {
      sortableColumns: ['id', 'createdAt', 'action'],
      searchableColumns: ['username'],
      defaultSortBy: [['id', 'DESC']],
      defaultLimit: 20,
      maxLimit: 100,
      filterableColumns: {
        username: [FilterOperator.ILIKE],
        action: [FilterOperator.EQ, FilterOperator.IN],
        success: [FilterOperator.EQ],
        userId: [FilterOperator.EQ],
        createdAt: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
    });

    return toPaginatedResponse(result, (item) =>
      LoginLogResponseDto.fromEntity(item),
    );
  }

  async findOne(id: number): Promise<AuditLogResponseDto | null> {
    const row = await this.auditRepo.findOneBy({ id });
    return row ? AuditLogResponseDto.fromEntity(row) : null;
  }

  async findOneLogin(id: number): Promise<LoginLogResponseDto | null> {
    const row = await this.loginRepo.findOneBy({ id });
    return row ? LoginLogResponseDto.fromEntity(row) : null;
  }

  /**
   * Xoá log cũ hơn RETENTION_DAYS ngày.
   * Batch delete 1000 row/batch, nghỉ 100ms giữa batch tránh lock table.
   * Trả về tổng số row đã xoá.
   */
  async cleanupExpired(): Promise<{ audit: number; login: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const auditDeleted = await this.batchDelete(
      this.auditRepo,
      cutoff,
      'audit_logs',
    );
    const loginDeleted = await this.batchDelete(
      this.loginRepo,
      cutoff,
      'login_logs',
    );

    this.logger.log(
      `Cleanup log cũ hơn ${RETENTION_DAYS} ngày: audit=${auditDeleted}, login=${loginDeleted}`,
    );

    return { audit: auditDeleted, login: loginDeleted };
  }

  private async batchDelete<T extends { id: number; createdAt: Date }>(
    repo: Repository<T>,
    cutoff: Date,
    label: string,
  ): Promise<number> {
    let total = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rows = await repo.find({
        where: { createdAt: LessThan(cutoff) } as never,
        select: { id: true } as never,
        take: BATCH_SIZE,
      });

      if (rows.length === 0) break;

      const ids = rows.map((r) => r.id);
      await repo.delete(ids);
      total += ids.length;

      if (rows.length < BATCH_SIZE) break;
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }

    if (total > 0) {
      this.logger.debug(`Đã xoá ${total} row từ ${label}`);
    }
    return total;
  }
}
