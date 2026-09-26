import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  // Handle SIGTERM/SIGINT so a `pm2 reload` during a deploy drains in-flight
  // requests instead of dropping them: Nest closes the HTTP server (waiting for
  // active requests), and PrismaService.onModuleDestroy disconnects the pool.
  // Registered before listen() so no traffic is served before the handler is in
  // place. Node's 5s default keepAliveTimeout keeps the drain inside the 10s
  // kill_timeout set in scripts/ecosystem.config.cjs.
  app.enableShutdownHooks();

  // Allow PPTX/PDF uploads through the API
  const express = require('express') as {
    json: (opts: { limit: string }) => unknown;
    urlencoded: (opts: {
      limit: string;
      extended: boolean;
    }) => unknown;
  };

  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ limit: '30mb', extended: true }));

  app.setGlobalPrefix('api');

  // Allowed frontend origins (env + known production hosts)
  const origins = [
    ...(process.env.APP_ORIGIN ?? 'http://localhost:3000').split(','),
    ...(process.env.NEXT_PUBLIC_APP_URL ?? '').split(','),
    'https://incubation.prabodh.app',
    'https://www.incubation.prabodh.app',
    'https://prabodh-2.onrender.com',
    'http://localhost:3000',
  ]
    .map((s: string) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowed = new Set(origins);

  const isAllowedOrigin = (origin?: string) => {
    if (!origin) return true;
    const normalized = origin.replace(/\/$/, '');
    if (allowed.has(normalized)) return true;
    try {
      const host = new URL(origin).hostname;
      if (host === 'localhost' || host === '127.0.0.1') return true;
      if (host === 'prabodh.app' || host.endsWith('.prabodh.app')) return true;
      if (host.endsWith('.onrender.com')) return true;
    } catch {
      return false;
    }
    return false;
  };

  app.enableCors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV !== 'production' || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin ${origin}`));
    },
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);

  console.log(`SIH Portal API listening on port ${port}/api`);
}

bootstrap();