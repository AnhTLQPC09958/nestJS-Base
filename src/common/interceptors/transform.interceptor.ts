import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BYPASS_TRANSFORM_KEY } from '../decorators/bypass-transform.decorator';

export interface ResponseFormat<T> {
  statusCode: number;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseFormat<T> | T
> {
  constructor(private readonly reflector: Reflector) { }

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseFormat<T> | T> {
    const bypass = this.reflector.getAllAndOverride<boolean>(
      BYPASS_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (bypass) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const statusCode = response?.statusCode || 200;

    return next.handle().pipe(
      map((data) => ({
        statusCode,
        data: data !== undefined ? data : null,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
