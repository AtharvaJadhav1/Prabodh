import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // Allow PPTX/PDF uploads sent through the API (default Nest limit is ~100kb).
  app.useBodyParser('json', { limit: '30mb' });
  app.useBodyParser('urlencoded', { limit: '30mb', extended: true });
  app.setGlobalPrefix('api');
  const origins = [
    ...(process.env.APP_ORIGIN ?? 'http://localhost:3000').split(','),
    ...(process.env.NEXT_PUBLIC_APP_URL ?? '').split(','),
    'https://prabodh-2.onrender.com',
    'http://localhost:3000',
  ]
    .map((s: string) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const allowed = [...new Set(origins)];
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? allowed : true,
    credentials: true,
  });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`SIH Portal API listening on http://localhost:${port}/api`);
}

bootstrap();
