import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserDevice } from './entities/user-device.entity';
import { UserDevicesService } from './user-devices.service';
import { UserDevicesController } from './user-devices.controller';
import { UserDevicesCron } from './user-devices.cron';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserDevice])],
  controllers: [UserDevicesController],
  providers: [UserDevicesService, UserDevicesCron],
  exports: [UserDevicesService],
})
export class UserDevicesModule {}
