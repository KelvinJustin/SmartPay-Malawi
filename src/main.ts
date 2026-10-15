import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Parse incoming cookies so Passport can read the JWT cookie.
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Apply /v1 prefix to ALL routes globally
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Allow the React frontend to make requests with cookies.
  // FRONTEND_URL must be the EXACT origin of the frontend (no trailing slash).
  // `credentials: true` is required for the browser to send/accept cookies,
  // and it cannot be combined with origin '*'.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();