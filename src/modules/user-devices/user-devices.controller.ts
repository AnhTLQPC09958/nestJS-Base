import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { UserDevicesService } from './user-devices.service';
import { RevokedTokensService } from '../revoked-tokens/revoked-tokens.service';
import {
  CheckPermission,
  CurrentUser,
  DeviceId,
} from '../../common/decorators';
import { ErrorCode, PermissionAction } from '../../common/constants';
import { NotFoundException } from '../../common/exceptions';

@Controller('thiet-bi')
export class UserDevicesController {
  constructor(
    private readonly service: UserDevicesService,
    private readonly revokedTokensService: RevokedTokensService,
  ) {}

  @Get()
  @CheckPermission('thiet-bi', PermissionAction.INDEX)
  list(@CurrentUser('id') userId: number, @DeviceId() deviceId: string) {
    return this.service.listByUser(userId, deviceId);
  }

  // ROUTE LITERAL TRƯỚC :id
  @Delete('khac/all')
  @HttpCode(HttpStatus.OK)
  @CheckPermission('thiet-bi', PermissionAction.DELETE)
  async revokeOthers(
    @DeviceId() deviceId: string,
    @CurrentUser('id') userId: number,
  ) {
    const rows = await this.service.revokeAllExcept(userId, deviceId);

    // Blacklist jti của từng device bị revoke
    const validRows = rows.filter(
      (r): r is typeof r & { jti: string } => !!r.jti,
    );
    if (validRows.length > 0) {
      await this.revokedTokensService.revokeMany(
        validRows.map((r) => ({
          jti: r.jti,
          userId,
          deviceId: r.deviceId,
          revokedReason: 'force_logout',
        })),
      );
    }

    return { revoked: rows.length };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermission('thiet-bi', PermissionAction.DELETE)
  async revoke(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<void> {
    const device = await this.service.revokeById(id, userId);
    if (!device) {
      throw new NotFoundException(
        ErrorCode.NOT_FOUND,
        'Thiết bị không tồn tại',
      );
    }

    // Blacklist jti
    if (device.jti) {
      await this.revokedTokensService.revoke({
        jti: device.jti,
        userId,
        deviceId: device.deviceId,
        reason: 'admin_revoke',
      });
    }
  }
}
