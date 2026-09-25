import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permissionIds?: number[];
}

export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['name', 'permissionIds'] as const),
) {}

export class AssignPermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permissionIds!: number[];
}
