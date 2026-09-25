import { Controller, Get } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CheckPermission } from 'src/common/decorators';
import { PermissionAction } from 'src/common/constants';

@Controller('quyen')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @CheckPermission('vai-tro', PermissionAction.INDEX)
  findAll() {
    return this.permissionsService.findAllGrouped();
  }
}
