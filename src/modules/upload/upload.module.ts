import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { buildMulterOptions } from './multer.config';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildMulterOptions(
          config.getOrThrow<string>('upload.dest'),
          config.getOrThrow<number>('upload.maxSize'),
        ),
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
