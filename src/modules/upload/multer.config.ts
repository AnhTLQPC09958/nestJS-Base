import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ErrorCode } from 'src/common/constants';

/**
 * Danh sách MIME types cho phép.
 * Mở rộng khi cần — VD: video/mp4, application/zip...
 */
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'text/csv',
];

export function buildMulterOptions(
  dest: string,
  maxSize: number,
): MulterOptions {
  return {
    storage: diskStorage({
      // Đảm bảo folder tồn tại trước khi gửi
      destination: (_req, _file, cb) => {
        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
      },

      //   Filname: ${date.now()}-${8 random bytes hex}${ext}
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const random = randomBytes(4).toString('hex');
        cb(null, `${Date.now()}-${random}${ext}`);
      },
    }),
    limits: {
      fileSize: maxSize,
    },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(
          new BadRequestException({
            code: ErrorCode.UPLOAD_INVALID_TYPE,
            message: `Định dạng file không được phép: ${file.mimetype}`,
          }),
          false,
        );
      }
      cb(null, true);
    },
  };
}
