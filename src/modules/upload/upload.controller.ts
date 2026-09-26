import {
  Controller,
  HttpStatus,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { UploadService } from './upload.service';
import { UploadedFileDto, UploadMultipleResponseDto } from './dto';
import { ErrorCode } from '../../common/constants';
import { CoreException } from '../../common/exceptions';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadSingle(@UploadedFile() file?: Express.Multer.File): UploadedFileDto {
    if (!file) {
      throw new CoreException(
        ErrorCode.UPLOAD_NO_FILE,
        'Chưa chọn file để upload',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.uploadService.uploadSingle(file);
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadMultiple(
    @UploadedFiles() files?: Express.Multer.File[],
  ): UploadMultipleResponseDto {
    if (!files || files.length === 0) {
      throw new CoreException(
        ErrorCode.UPLOAD_NO_FILE,
        'Chưa chọn file để upload',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.uploadService.uploadMultiple(files);
  }
}
