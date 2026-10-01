import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';

import { AuditLogService } from './audit-log.service';
import { CheckPermission } from '../../common/decorators';
import { ErrorCode, PermissionAction } from '../../common/constants';
import { NotFoundException } from '../../common/exceptions';

@Controller('nhat-ky')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  // ============ ROUTE LITERAL — PHẢI ĐẶT TRƯỚC :id ============

  @Get('dang-nhap')
  @CheckPermission('nhat-ky', PermissionAction.INDEX)
  findLoginLogs(@Paginate() query: PaginateQuery) {
    return this.auditLogService.findLoginLogs(query);
  }

  @Get('dang-nhap/:id')
  @CheckPermission('nhat-ky', PermissionAction.SHOW)
  async findOneLogin(@Param('id', ParseIntPipe) id: number) {
    const row = await this.auditLogService.findOneLogin(id);
    if (!row) {
      throw new NotFoundException(ErrorCode.NOT_FOUND, 'Log không tồn tại');
    }
    return row;
  }

  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  @CheckPermission('nhat-ky', PermissionAction.DELETE)
  cleanup() {
    return this.auditLogService.cleanupExpired();
  }

  // ============ LIST + PARAM ============

  @Get()
  @CheckPermission('nhat-ky', PermissionAction.INDEX)
  findAll(@Paginate() query: PaginateQuery) {
    return this.auditLogService.findAll(query);
  }

  @Get(':id')
  @CheckPermission('nhat-ky', PermissionAction.SHOW)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const row = await this.auditLogService.findOne(id);
    if (!row) {
      throw new NotFoundException(ErrorCode.NOT_FOUND, 'Log không tồn tại');
    }
    return row;
  }
}
