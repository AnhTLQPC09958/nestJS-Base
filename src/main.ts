import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);

  // ===== Security Headers =====
  app.use(
    helmet({
      // Tắt CSP cho dev — bật khi prod (cần config chi tiết theo FE)
      contentSecurityPolicy: false,
      // Cho phép cross-origin resource (FE gọi từ port khác)
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ===== Cookie Parser =====
  // Parse cookie từ header "Cookie" -> req.cookie.<name>
  // Cần cho refresh token
  app.use(cookieParser());

  // ===== Static files =====
  // File vật lý: ./uploads/xxx.pdf
  // URL serve:   http://localhost:3000/uploads/xxx.pdf
  const uploadDest = configService.getOrThrow<string>('upload.dest');
  app.useStaticAssets(join(process.cwd(), uploadDest), {
    prefix: '/uploads/',
  });

  // ===== CORS =====
  app.enableCors({
    origin: configService.get<string[]>('cors.origins'),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'device-id'],
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

  app.useGlobalFilters(new HttpExceptionFilter());

  // ===== Trust Proxy (nếu chạy sau Nginx/Load balancer) =====
  // Cần thiết để req.ip lấy đúng IP client thật
  app.set('trust proxy', 1);

  // ===== Disable x-powered-by =====
  app.disable('x-powered-by');

  // ===== Swagger OpenAPI =====
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Core Base API')
    .setDescription('Hệ thống tài liệu API và API Playground')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Nhập Access Token (Bearer)',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'device-id',
        in: 'header',
        description: 'Device ID của client (UUID/string)',
      },
      'device-id',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('app.port') ?? 3000;

  await app.listen(port);
  console.log(`***** App running *****: http://localhost:${port}`);
  console.log(`📑 Swagger Docs: http://localhost:${port}/api/docs`);
  console.log(`📁 Uploads served at: /uploads/*`);
  console.log(
    `***** CORS allowed *****: ${configService.get<string[]>('cors.origins')?.join(', ')}`,
  );
}
bootstrap();
