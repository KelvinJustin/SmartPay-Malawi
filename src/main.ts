import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // Parse incoming cookies so Passport can read the JWT cookie.
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Allow the React frontend to make requests with cookies.
  // Change this origin if your frontend uses another port.
  // app.enableCors({
  //   origin: 'http://localhost:5173',
  //   credentials: true,
  // });

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();