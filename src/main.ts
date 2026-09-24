import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // ===== Cookie Parser =====
  // Parse cookie từ header "Cookie" -> req.cookie.<name>
  // Cần cho refresh token
  app.use(cookieParser());

  // ===== CORS =====
  app.enableCors({
    origin: configService.get<string[]>('cors.origins'),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ===== Global ValidationPipe =====
  // - whitelist: loại bỏ field không có trong DTO
  // - forbidNonWhitelisted: báo lỗi nếu client gửi field lạ
  // - transform: auto convert type theo DTO (VD: string "1" → number 1)
  // - transformOptions.enableImplicitConversion: false → không tự đổi type
  //   (khuyến nghị false để rõ ràng — phải dùng @Type() thủ công)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Global exception filter - format lỗi chuẩn
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get<number>('app.port') ?? 3000;

  await app.listen(port);
  console.log(`***** App running *****: http://localhost:${port}`);
  console.log(
    `***** CORS allowed *****: ${configService.get<string[]>('cors.origins')?.join(', ')}`,
  );
}
bootstrap();
