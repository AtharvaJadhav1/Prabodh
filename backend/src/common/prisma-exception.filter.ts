import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/**
 * Maps Prisma request errors to actionable HTTP responses instead of Nest's
 * generic 500, and logs the code/meta/stack so the cause is visible in the host logs.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Prisma');

  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const [status, message] = this.map(err);
    this.logger.error(
      `${req.method} ${req.originalUrl} -> ${status} ${err.code} ${JSON.stringify(err.meta ?? {})}: ${err.message}`,
      err.stack,
    );
    res.status(status).json({ statusCode: status, message, code: err.code });
  }

  private map(err: Prisma.PrismaClientKnownRequestError): [number, string] {
    const meta = (err.meta ?? {}) as Record<string, unknown>;
    switch (err.code) {
      case 'P2025':
        return [HttpStatus.NOT_FOUND, 'Record not found (it may already have been removed)'];
      case 'P2003':
        return [
          HttpStatus.CONFLICT,
          `Operation blocked: record is still referenced${meta.field_name ? ` by ${meta.field_name}` : ''}`,
        ];
      case 'P2002':
        return [HttpStatus.CONFLICT, `Duplicate value${meta.target ? ` for ${String(meta.target)}` : ''}`];
      case 'P2028':
      case 'P2034':
        return [HttpStatus.SERVICE_UNAVAILABLE, 'The operation timed out or conflicted with another change. Please retry.'];
      default:
        return [HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error'];
    }
  }
}
