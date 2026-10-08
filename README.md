# 🛡️ NestJS Core Base - Backend Architecture & Developer Guide

Hệ thống khung Backend chuẩn Enterprise xây dựng trên **NestJS 11**, **TypeORM**, **MySQL**, **Passport JWT**, hỗ trợ cơ chế bảo mật phiên đa thiết bị, phân quyền RBAC chi tiết đến từng action, tự động ghi Audit Log và tối ưu hiệu suất với In-Memory Caching.

---

## 📑 Mục lục
1. [Tech Stack & Cấu trúc thư mục](#1-tech-stack--cấu-trúc-thư-mục)
2. [Cài đặt & Biến môi trường](#2-cài-đặt--biến-môi-trường)
3. [Các tính năng cốt lõi đã thiết lập sẵn](#3-các-tính-năng-cốt-lõi-đã-thiết-lập-sẵn)
4. [Hướng dẫn tạo 1 Module mới hoàn chỉnh từ A - Z](#4-hướng-dẫn-tạo-1-module-mới-hoàn-chỉnh-từ-a---z)
   - [Bước 1: Tạo Entity kế thừa BaseEntity](#bước-1-tạo-entity-kế-thừa-baseentity)
   - [Bước 2: Tạo bộ DTO chuẩn (Create, Update, Response, Option)](#bước-2-tạo-bộ-dto-chuẩn-create-update-response-option)
   - [Bước 3: Tạo Service với đầy đủ các hàm CRUD](#bước-3-tạo-service-với-đầy-đủ-các-hàm-crud)
   - [Bước 4: Tạo Controller với đầy đủ Decorator & Swagger](#bước-4-tạo-controller-với-đầy-đủ-decorator--swagger)
   - [Bước 5: Đăng ký Module & Khai báo Phân quyền](#bước-5-đăng-ký-module--khai-báo-phân-quyền)
5. [Tài liệu API Swagger](#5-tài-liệu-api-swagger)
6. [Lưu ý khi triển khai Production](#6-lưu-ý-khi-triển-khai-production)

---

## 1. Tech Stack & Cấu trúc thư mục

- **Framework**: NestJS 11 (Express platform).
- **ORM**: TypeORM 0.3+ kết nối MySQL.
- **Authentication**: Passport JWT + Refresh Token (HttpOnly Cookie), kiểm soát thiết bị qua header `device-id`.
- **Authorization**: RBAC (Role-Based Access Control) theo Module + Action (`SHOW_MENU`, `SHOW`, `CREATE`, `EDIT`, `DELETE`).
- **Audit & Monitoring**: `AuditLogInterceptor` tự động ghi vết API thay đổi dữ liệu, `@nestjs/terminus` (Health check), `@nestjs/throttler` (Rate limit).
- **Scheduled Tasks**: `@nestjs/schedule` tự động dọn dẹp token hết hạn, OTP hết hạn và log cũ.
- **File Upload**: Multer diskStorage với whitelist MIME types và mã hóa tên file ngẫu nhiên.

```
src/
├── common/             # Dùng chung cho toàn bộ app
│   ├── constants/      # Error codes, Permission actions
│   ├── decorators/     # @CheckPermission(), @CurrentUser(), @Public(), @ClientInfo()
│   ├── exceptions/     # CoreException, NotFoundException, ForbiddenException
│   ├── filters/        # HttpExceptionFilter (Chuẩn hóa toàn bộ lỗi trả về)
│   ├── guards/         # JwtAuthGuard, PermissionGuard
│   ├── interceptors/   # TransformInterceptor (Wrap { data, statusCode }), AuditLogInterceptor
│   └── utils/          # toPaginatedResponse, helpers
├── config/             # ConfigModule & Validation schema biến môi trường
├── database/           # TypeOrmModule & SeedModule (Auto seed permissions/admin)
├── modules/
│   ├── audit-log/      # Nhật ký thao tác & Lịch sử đăng nhập
│   ├── auth/           # Login, Refresh, Logout, Forgot/Reset password
│   ├── permissions/    # Danh mục quyền hệ thống
│   ├── roles/          # Quản lý vai trò & gán quyền
│   ├── role-permissions/# In-memory Cache quyền của từng Role
│   ├── users/          # Quản lý người dùng
│   ├── user-devices/   # Quản lý phiên thiết bị đang hoạt động
│   ├── revoked-tokens/ # Blacklist token thu hồi tức thì
│   ├── upload/         # Tải lên tệp đơn/đa tệp
│   ├── mail/ & otp/    # Gửi mail OTP đổi/quên mật khẩu
│   └── health/         # Healthcheck endpoint (/health)
└── main.ts             # Entrypoint khởi tạo app, Helmet, CORS, Swagger, Pipes
```

---

## 2. Cài đặt & Biến môi trường

### File môi trường `.env`:
```env
# Application
NODE_ENV=development
PORT=3000

# Database MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=core_base_db
DB_SYNCHRONIZE=true

# JWT Secrets & Expiration
JWT_ACCESS_SECRET=your_jwt_access_secret_key_very_long_and_secure
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_very_long_and_secure
JWT_REFRESH_EXPIRES_IN=7d

# Upload
UPLOAD_DEST=./uploads
UPLOAD_MAX_SIZE=10485760 # 10MB

# Rate Limit (Throttler)
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Chạy hệ thống:
```bash
# Cài đặt thư viện
npm install

# Chạy môi trường Dev (Hot reload)
npm run start:dev

# Build và chạy Production
npm run build
npm run start:prod
```

---

## 3. Các tính năng cốt lõi đã thiết lập sẵn

1. **RBAC & Check Permission**:
   - Sử dụng decorator `@CheckPermission('module-key', PermissionAction.ACTION)`.
   - Chuẩn hóa: Toàn bộ endpoint lấy danh sách dữ liệu dùng `PermissionAction.INDEX`, endpoint xem chi tiết dùng `PermissionAction.SHOW`, các endpoint thao tác dùng `CREATE`, `EDIT`, `DELETE`. `SHOW_MENU` chỉ dùng cho kiểm tra quyền hiển thị menu trên giao diện.
   - `PermissionGuard` tự động kiểm tra quyền dựa trên `PermissionsMap` trong cache.
2. **Cơ chế Cache Quyền (`RolePermissionsService`)**:
   - In-memory cache quyền với TTL 5 phút, tự động gọi `clearCache(roleId)` khi Admin thay đổi phân quyền. Tiết kiệm 100% câu query permissions lặp lại trên mỗi HTTP request.
3. **Quản lý Phiên đa thiết bị & Thu hồi tức thì (In-Memory Revocation Set)**:
   - Mỗi client bắt buộc gửi header `device-id` (UUID) khớp với JWT payload.
   - `RevokedTokensService` lưu trữ một `Set<string>` trong bộ nhớ RAM (O(1)). Khi app khởi động (`onApplicationBootstrap`), toàn bộ token thu hồi còn hạn được nạp sẵn từ MySQL vào RAM.
   - Khi logout hoặc đổi mật khẩu, JTI được thêm tức thì vào RAM và lưu DB. `JwtStrategy` kiểm tra sync `isRevoked({ jti })` trong O(1) mà không chạm MySQL.
   - Hỗ trợ `revokeMany` hàng loạt khi đổi mật khẩu hoặc đăng xuất tất cả thiết bị khác (`/thiet-bi/khac/all`).
4. **Lưu trữ Upload Cục bộ (Local Disk Storage)**:
   - Module upload lưu trực tiếp vào thư mục tĩnh cấu hình (`./uploads`), phục vụ qua URL prefix `/uploads/*`.
   - Không phụ thuộc Cloud / AWS S3, tránh rủi ro phát sinh chi phí hoặc tràn quota khi dev và thử nghiệm.
   - Tích hợp kiểm duyệt MIME type, giới hạn dung lượng và tự động sinh tên file an toàn qua Multer.
5. **Audit Log tự động**:
   - Đính kèm decorator `@AuditLog({ action: 'create', module: '...', description: '...' })` tại Controller. `AuditLogInterceptor` sẽ tự động ghi lại IP, UserAgent, ActorId, Method, Endpoint, Payload (tự động mask các trường nhạy cảm như password).
6. **Idempotent Seed Service (`SeedService`)**:
   - Tự động nạp danh sách quyền mới khi khởi động server mà không làm mất dữ liệu phân quyền cũ.
   - Tự động bổ sung quyền mới cho tài khoản Admin mặc định và bảo vệ vai trò Admin hệ thống (`isSystem: true`).
7. **Chuẩn hóa API Response**:
   - Response thành công tự động bọc bởi `TransformInterceptor`: `{ statusCode: 200, data: ... }`.
   - Lỗi được bắt bởi `HttpExceptionFilter` với mã lỗi chuẩn `ErrorCode` và format `{ statusCode, code, message, timestamp }`.

---

## 4. Hướng dẫn tạo 1 Module mới hoàn chỉnh từ A - Z

Ví dụ: Tạo module Quản lý Sản phẩm (`products`).

### Bước 1: Tạo Entity kế thừa `BaseEntity`
File: `src/modules/products/entities/product.entity.ts`
```ts
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../database/entities';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ length: 150 })
  name!: string;

  @Column({ unique: true, length: 50 })
  code!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  isActive!: boolean;
}
```

---

### Bước 2: Tạo bộ DTO chuẩn (Create, Update, Response, Option)

#### File: `src/modules/products/dto/create-product.dto.ts`
```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 16 Pro Max' })
  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'IP16PM-256' })
  @IsString()
  @IsNotEmpty({ message: 'Mã sản phẩm không được để trống' })
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 29990000 })
  @IsNumber()
  @Min(0, { message: 'Giá sản phẩm phải >= 0' })
  price!: number;

  @ApiPropertyOptional({ example: 'Phiên bản Titan Tự Nhiên' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
```

#### File: `src/modules/products/dto/update-product.dto.ts`
```ts
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

#### File: `src/modules/products/dto/product-response.dto.ts`
```ts
import { Product } from '../entities/product.entity';

export class ProductResponseDto {
  id!: number;
  name!: string;
  code!: string;
  price!: number;
  description?: string;
  isActive!: boolean;
  createdAt!: Date;

  static fromEntity(entity: Product): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.code = entity.code;
    dto.price = Number(entity.price);
    dto.description = entity.description;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}

export class ProductOptionDto {
  id!: number;
  name!: string;

  static fromEntity(entity: Product): ProductOptionDto {
    return { id: entity.id, name: entity.name };
  }
}
```

---

### Bước 3: Tạo Service với đầy đủ các hàm CRUD
File: `src/modules/products/products.service.ts`
```ts
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';

import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto, ProductResponseDto, ProductOptionDto } from './dto';
import { CoreException, NotFoundException } from '../../common/exceptions';
import { ErrorCode } from '../../common/constants';
import { PaginatedResponse } from '../../common/types';
import { toPaginatedResponse } from '../../common/utils';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // 1. Phân trang, tìm kiếm, lọc (findAll)
  async findAll(query: PaginateQuery): Promise<PaginatedResponse<ProductResponseDto>> {
    const result = await paginate<Product>(query, this.productRepo, {
      sortableColumns: ['id', 'name', 'code', 'price', 'createdAt'],
      searchableColumns: ['name', 'code'],
      defaultSortBy: [['id', 'DESC']],
      defaultLimit: 20,
      maxLimit: 100,
      filterableColumns: {
        name: [FilterOperator.ILIKE],
        code: [FilterOperator.ILIKE],
        isActive: [FilterOperator.EQ],
        price: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
    });

    return toPaginatedResponse(result, (item) =>
      ProductResponseDto.fromEntity(item),
    );
  }

  // 2. Lấy chi tiết theo ID (findById)
  async findById(id: number): Promise<ProductResponseDto> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(ErrorCode.NOT_FOUND, 'Sản phẩm không tồn tại');
    }
    return ProductResponseDto.fromEntity(product);
  }

  // 3. Lấy danh sách options rút gọn (findOption cho SelectApi)
  async findOptions(): Promise<ProductOptionDto[]> {
    const items = await this.productRepo.find({
      where: { isActive: true },
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
    return items.map(ProductOptionDto.fromEntity);
  }

  // 4. Tạo mới (create)
  async create(dto: CreateProductDto, actorId: number): Promise<ProductResponseDto> {
    const exists = await this.productRepo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new CoreException(ErrorCode.VALIDATION_FAILED, 'Mã sản phẩm đã tồn tại', HttpStatus.CONFLICT);
    }

    const product = this.productRepo.create({
      ...dto,
      createdBy: actorId,
      updatedBy: actorId,
    });

    const saved = await this.productRepo.save(product);
    return ProductResponseDto.fromEntity(saved);
  }

  // 5. Cập nhật (update)
  async update(id: number, dto: UpdateProductDto, actorId: number): Promise<ProductResponseDto> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(ErrorCode.NOT_FOUND, 'Sản phẩm không tồn tại');
    }

    if (dto.code && dto.code !== product.code) {
      const exists = await this.productRepo.findOne({ where: { code: dto.code } });
      if (exists) {
        throw new CoreException(ErrorCode.VALIDATION_FAILED, 'Mã sản phẩm đã tồn tại', HttpStatus.CONFLICT);
      }
    }

    Object.assign(product, {
      ...dto,
      updatedBy: actorId,
    });

    const saved = await this.productRepo.save(product);
    return ProductResponseDto.fromEntity(saved);
  }

  // 6. Xóa (delete)
  async delete(id: number): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(ErrorCode.NOT_FOUND, 'Sản phẩm không tồn tại');
    }
    await this.productRepo.remove(product);
  }
}
```

---

### Bước 4: Tạo Controller với đầy đủ Decorator & Swagger
File: `src/modules/products/products.controller.ts`
```ts
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Paginate, type PaginateQuery } from 'nestjs-paginate';

import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { CheckPermission, CurrentUser } from '../../common/decorators';
import { PermissionAction } from '../../common/constants';
import { AuditLog } from '../audit-log/decorators/audit-log.decorator';

@ApiTags('Sản phẩm (Products)')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm phân trang & tìm kiếm' })
  @CheckPermission('products', PermissionAction.INDEX)
  findAll(@Paginate() query: PaginateQuery) {
    return this.productsService.findAll(query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Lấy options sản phẩm cho dropdown' })
  findOptions() {
    return this.productsService.findOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết sản phẩm theo ID' })
  @CheckPermission('products', PermissionAction.SHOW)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo mới sản phẩm' })
  @CheckPermission('products', PermissionAction.CREATE)
  @AuditLog({ action: 'create', module: 'products', description: 'Tạo mới sản phẩm' })
  create(@Body() dto: CreateProductDto, @CurrentUser('id') actorId: number) {
    return this.productsService.create(dto, actorId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin sản phẩm' })
  @CheckPermission('products', PermissionAction.EDIT)
  @AuditLog({ action: 'update', module: 'products', description: 'Cập nhật sản phẩm' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser('id') actorId: number,
  ) {
    return this.productsService.update(id, dto, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa sản phẩm' })
  @CheckPermission('products', PermissionAction.DELETE)
  @AuditLog({ action: 'delete', module: 'products', description: 'Xóa sản phẩm' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productsService.delete(id);
  }
}
```

---

### Bước 5: Đăng ký Module & Khai báo Phân quyền

1. **Tạo `products.module.ts`**:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

2. **Thêm vào `app.module.ts`**:
Khai báo `ProductsModule` trong mảng `imports`.

3. **Thêm quyền mặc định vào Seed Data**:
Trong file `src/database/seeds/data/permissions.data.ts`:
```ts
{ moduleKey: 'products', action: PermissionAction.SHOW_MENU, description: 'Xem menu Sản phẩm' },
{ moduleKey: 'products', action: PermissionAction.SHOW, description: 'Xem chi tiết Sản phẩm' },
{ moduleKey: 'products', action: PermissionAction.CREATE, description: 'Tạo mới Sản phẩm' },
{ moduleKey: 'products', action: PermissionAction.EDIT, description: 'Sửa Sản phẩm' },
{ moduleKey: 'products', action: PermissionAction.DELETE, description: 'Xóa Sản phẩm' },
```
Khởi động lại ứng dụng, `SeedService` sẽ tự động thêm quyền này vào DB và gán thẳng cho vai trò Admin!

---

## 5. Tài liệu API Swagger

Khi server khởi chạy, truy cập đường dẫn:
```
http://localhost:3000/api/docs
```
- Tích hợp Bearer Token (`JWT-auth`) và header `device-id`.
- Cho phép test API trực tiếp (Interactive Playground).

---

## 6. Lưu ý khi triển khai Production

1. **Tắt `DB_SYNCHRONIZE`**:
   Bắt buộc đặt `DB_SYNCHRONIZE=false` và `NODE_ENV=production` trong file `.env` production để tránh nguy cơ ghi đè schema làm mất dữ liệu.
2. **Cấu hình Connection Pool cho MySQL**:
   Trong `database.module.ts`, bổ sung cấu hình connection pool `extra: { connectionLimit: 25 }` để chịu tải đồng thời.
3. **Thư mục lưu trữ tệp Upload**:
   Mount volume riêng cho thư mục `./uploads` hoặc tích hợp AWS S3/MinIO nếu chạy trên môi trường Docker/Kubernetes container đa replica.
4. **Proxy & HTTPS**:
   Giữ nguyên `app.set('trust proxy', 1)` trong `main.ts` khi đặt ứng dụng phía sau Nginx hoặc Cloudflare để nhận diện đúng IP Client thật.
