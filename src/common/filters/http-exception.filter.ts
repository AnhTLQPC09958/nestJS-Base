import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-code.constant';
import { MulterError } from 'multer';

/**
 * Bắt mọi exception → format chuẩn:
 *   {
 *     statusCode: number,
 *     code?: string,           ← mã lỗi FE map message
 *     message: string | string[],
 *     error?: string,
 *     path: string,
 *     timestamp: string,
 *   }
 *
 * - HttpException (có status) → giữ message gốc, thêm code nếu có.
 * - ValidationPipe (BadRequest) → mảng message[].
 * - Lỗi khác (runtime) → 500, log error, ẩn chi tiết khỏi client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, error } = this.parseException(exception);

    if (status >= 500) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (this.logger.error(`${request.method} ${request.url} -> ${status}`),
        exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({
      statusCode: status,
      ...(code && { code }),
      message,
      ...(error && { error }),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private parseException(exception: unknown): {
    status: number;
    code?: string;
    message: string | string[];
    error?: string;
  } {
    // ===== MulterError (file upload) =====
    if (exception instanceof MulterError) {
      const codeMap: Record<string, { code: string; message: string }> = {
        LIMIT_FILE_SIZE: {
          code: ErrorCode.UPLOAD_FILE_TOO_LARGE,
          message: 'File vượt quá kích thước cho phép',
        },
        LIMIT_UNEXPECTED_FILE: {
          code: ErrorCode.UPLOAD_INVALID_TYPE,
          message: `Field "${exception.field}" không được phép`,
        },
      };
      const mapped = codeMap[exception.code];
      return {
        status: HttpStatus.BAD_REQUEST,
        code: mapped?.code ?? ErrorCode.VALIDATION_FAILED,
        message: mapped?.message ?? exception.message,
      };
    }

    // ===== HttpException (bao gồm CoreException) =====
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
        return {
          status: HttpStatus.BAD_REQUEST, // Trả 400 cho FE dễ xử lý (không phải 413)
          code: ErrorCode.UPLOAD_FILE_TOO_LARGE,
          message: 'File vượt quá kích thước cho phép',
        };
      }
      // Nest ValidationPipe : { statusCode, message: string[], error}
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;

        // Trường hợp CoreException: { code, message }
        // (thường Nest giữ nguyên object này khi throw BadRequestException({...}))
        if (typeof b.code === 'string' && typeof b.message === 'string') {
          return {
            status,
            code: b.code,
            message: b.message,
          };
        }

        // Nest ValidationPipe / mặc định: { statusCode, message, error }
        return {
          status,
          code: typeof b.code === 'string' ? b.code : undefined,
          message: (b.message as string | string[]) ?? exception.message,
          error: typeof b.error === 'string' ? b.error : undefined,
        };
      }

      // Trường hợp body là string
      return { status, message: String(body) };
    }

    // ===== Lỗi runtime =====
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
    };
  }
}
