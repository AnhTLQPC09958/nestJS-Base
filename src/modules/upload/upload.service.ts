import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadedFileDto,
  UploadMultipleResponseDto,
} from './dto/upload-response.dto';

@Injectable()
export class UploadService {
  private readonly dest: string;

  constructor(private readonly config: ConfigService) {
    this.dest = this.config.getOrThrow<string>('upload.dest');
  }

  uploadSingle(file: Express.Multer.File): UploadedFileDto {
    return UploadedFileDto.fromMulterFile(file, this.dest);
  }

  uploadMultiple(files: Express.Multer.File[]): UploadMultipleResponseDto {
    return {
      message: `Upload thành công ${files.length} file`,
      files: files.map((f) => UploadedFileDto.fromMulterFile(f, this.dest)),
    };
  }
}
