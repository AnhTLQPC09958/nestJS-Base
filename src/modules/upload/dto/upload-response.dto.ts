export class UploadedFileDto {
  /** Đường dẫn tương đối — FE ghép với VITE_API_URL */
  path!: string;

  /** Tên gốc của file (client gửi lên) */
  name!: string;

  /** Kích thước (byte) */
  size!: number;

  /** MIME type */
  type!: string;

  static fromMulterFile(
    file: Express.Multer.File,
    dest: string,
  ): UploadedFileDto {
    // dest="./uploads" → path="uploads/xxx.pdf" (strip "./" prefix)
    const cleanDest = dest.replace(/^\.\//, '').replace(/\/$/, '');
    return {
      path: `${cleanDest}/${file.filename}`,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    };
  }
}

export class UploadMultipleResponseDto {
  message!: string;
  files!: UploadedFileDto[];
}
