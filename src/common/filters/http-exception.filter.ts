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
    // ===== HttpException (bao gồm CoreException) =====
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // Nest ValidationPipe : { statusCode, message: string[], error}
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
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
