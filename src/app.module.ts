import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database';
import { UsersModule } from './modules/users/users.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UserRolesModule } from './modules/user-roles/user-roles.module';
import { RolePermissionsModule } from './modules/role-permissions/role-permissions.module';
import { SeedModule } from './database/seeds';
import { AuthModule } from './modules/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard, PermissionGuard } from './common/guards';
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
    UserRolesModule,
    RolePermissionsModule,
    AuthModule,
    // SeedModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
