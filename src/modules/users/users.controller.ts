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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CheckPermission, CurrentUser } from '../../common/decorators';
import { PermissionAction } from '../../common/constants/permission.constant';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CheckPermission('nguoi-dung', PermissionAction.INDEX)
  findAll(@Paginate() query: PaginateQuery) {
    return this.usersService.findAll(query);
  }

  // ============ OPTIONS (đặt trước /:id để không bị route conflict) ============
  @Get('options')
  getOptions() {
    return this.usersService.getOptions();
  }

  // ============ SHOW ============
  @Get(':id')
  @CheckPermission('nguoi-dung', PermissionAction.SHOW)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // ============ CREATE ============
  @Post()
  @CheckPermission('nguoi-dung', PermissionAction.CREATE)
  create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: number) {
    return this.usersService.create(dto, actorId);
  }

  // ============ UPDATE ============
  @Patch(':id')
  @CheckPermission('nguoi-dung', PermissionAction.EDIT)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') actorId: number,
  ) {
    return this.usersService.update(id, dto, actorId);
  }

  // ============ DELETE ============
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermission('nguoi-dung', PermissionAction.DELETE)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.usersService.remove(id);
  }
}
