import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.constant';

/**
 * Base exception cho toàn bộ app.
 * Mọi lỗi business nên throw từ đây để response có field `code`.
 */
export class CoreException extends HttpException {
  public readonly code: ErrorCode;

  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
    this.code = code;
  }
}

// ===== Common =====

export class ForbiddenException extends CoreException {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này') {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

export class UnauthorizedException extends CoreException {
  constructor(message = 'Chưa đăng nhập hoặc token không hợp lệ') {
    super(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
  }
}

export class NotFoundException extends CoreException {
  constructor(message = 'Không tìm thấy dữ liệu') {
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}
