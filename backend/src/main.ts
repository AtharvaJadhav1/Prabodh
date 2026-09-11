import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');
  const origins = (process.env.APP_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? origins : true,
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`SIH Portal API listening on http://localhost:${port}/api`);
}

bootstrap();
