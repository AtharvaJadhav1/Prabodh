import 'reflect-metadata';
import './lib/env-compat';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.AUTH_JWT_SECRET || process.env.AUTH_JWT_SECRET === 'dev-only-change-me')
  ) {
    console.error(
      'WARNING: AUTH_JWT_SECRET is not set — sign-in will fail until you configure it in App Service settings.',
    );
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
    // Cut Nest bootstrap/request noise under load; keep errors/warnings.
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn'],
  });

  // Handle SIGTERM/SIGINT so a `pm2 reload` during a deploy drains in-flight
  // requests instead of dropping them: Nest closes the HTTP server (waiting for
  // active requests), and PrismaService.onModuleDestroy disconnects the pool.
  // Registered before listen() so no traffic is served before the handler is in
  // place. Node's 5s default keepAliveTimeout keeps the drain inside the 10s
  // kill_timeout set in scripts/ecosystem.config.cjs.
  app.enableShutdownHooks();

  // Response hardening. Chat and comment responses are private, so browsers and proxies must not keep
  // copies of them (they could otherwise be read from a shared computer's cache after logout).
  app.use(
    (
      req: { path: string },
      res: { setHeader: (name: string, value: string) => void },
      next: () => void,
    ) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      if (req.path.startsWith('/api/chat') || /\/comments(\/|$)/.test(req.path)) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
      }
      next();
    },
  );

  // Prisma errors -> 404/409/503 with a readable message instead of a bare 500.
  app.useGlobalFilters(new PrismaExceptionFilter());

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
      if (host.endsWith('.azurewebsites.net')) return true;
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
  // Azure App Service reverse-proxy requires binding on all interfaces.
  await app.listen(port, '0.0.0.0');

  console.log(`SIH Portal API listening on port ${port}/api`);
}

bootstrap();