import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { PermissionAction } from 'src/common/constants';
import { CheckPermission, CurrentUser } from 'src/common/decorators';
import { Paginate, type PaginateQuery } from 'nestjs-paginate';
import { AssignPermissionsDto, CreateRoleDto, UpdateRoleDto } from './dto';

@Controller('vai-tro')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @CheckPermission('vai-tro', PermissionAction.INDEX)
  findAll(@Paginate() query: PaginateQuery) {
    return this.rolesService.findAll(query);
  }

  @Get('options')
  getOptions() {
    return this.rolesService.getOptions();
  }

  @Get(':id')
  @CheckPermission('vai-tro', PermissionAction.SHOW)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @CheckPermission('vai-tro', PermissionAction.CREATE)
  create(@Body() dto: CreateRoleDto, @CurrentUser('id') actorId: number) {
    return this.rolesService.create(dto, actorId);
  }

  @Patch(':id')
  @CheckPermission('vai-tro', PermissionAction.EDIT)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') actorId: number,
  ) {
    return this.rolesService.update(id, dto, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermission('vai-tro', PermissionAction.DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.rolesService.remove(id);
  }

  // ============ GET ROLE PERMISSIONS ============
  @Get(':id/permissions')
  @CheckPermission('vai-tro', PermissionAction.SHOW)
  getPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getRolePermissions(id);
  }

  // ============ ASSIGN PERMISSIONS ============
  @Put(':id/permissions')
  @CheckPermission('vai-tro', PermissionAction.EDIT)
  assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser('id') actorId: number,
  ) {
    return this.rolesService.assignPermissions(id, dto.permissionIds, actorId);
  }
}
