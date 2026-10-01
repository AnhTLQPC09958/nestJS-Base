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
import {
  CheckPermission,
  CurrentUser,
  DeviceId,
} from '../../common/decorators';
import { PermissionAction } from '../../common/constants';
import { NotFoundException, ForbiddenException } from '../../common/exceptions';
import { ErrorCode } from '../../common/constants';

@Controller('thiet-bi')
export class UserDevicesController {
  constructor(private readonly service: UserDevicesService) {}

  @Get()
  @CheckPermission('thiet-bi', PermissionAction.INDEX)
  list(@CurrentUser('id') userId: number, @DeviceId() deviceId: string) {
    return this.service.listByUser(userId, deviceId);
  }

  @Delete('khac/all')
  @HttpCode(HttpStatus.OK)
  @CheckPermission('thiet-bi', PermissionAction.DELETE)
  async revokeOthers(
    @DeviceId() deviceId: string,
    @CurrentUser('id') userId: number,
  ) {
    const count = await this.service.revokeAllExcept(userId, deviceId);
    return { revoked: count };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermission('thiet-bi', PermissionAction.DELETE)
  async revoke(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ): Promise<void> {
    const ok = await this.service.revokeById(id, userId);
    if (!ok) {
      throw new NotFoundException(
        ErrorCode.NOT_FOUND,
        'Thiết bị không tồn tại',
      );
    }
  }
}
