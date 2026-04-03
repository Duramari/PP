// ═══════════════════════════════════════════════════════════════
// COMMON MIDDLEWARE — Guards, Filters, Interceptors, Decorators
// ═══════════════════════════════════════════════════════════════

import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
  SetMetadata, ExceptionFilter, Catch, ArgumentsHost, HttpException,
  HttpStatus, NestInterceptor, CallHandler, Logger, createParamDecorator
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import * as slugifyLib from 'slugify';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Authentication required');

    const hasRole = required.some(r => user.role === r);
    if (!hasRole) throw new ForbiddenException(
      `Required role: ${required.join(' or ')}. Your role: ${user.role}`
    );
    return true;
  }
}

// ── http-exception.filter.ts ──────────────────────────────────

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();
    const req  = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    // Log 5xx errors
    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      message: typeof message === 'object' ? (message as any).message : message,
      errors:  typeof message === 'object' ? (message as any).errors : undefined,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}

// ── response.interceptor.ts ───────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// ── logging.interceptor.ts ────────────────────────────────────

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req   = ctx.switchToHttp().getRequest();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const ms  = Date.now() - start;
        const res = ctx.switchToHttp().getResponse();
        this.logger.log(
          `${req.method} ${req.url} ${res.statusCode} +${ms}ms`
        );
      }),
    );
  }
}

// ── current-user.decorator.ts ────────────────────────────────

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

// ── pagination.util.ts ────────────────────────────────────────
export interface PaginationResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

export function paginate<T>(
  data: T[], total: number, page: number, limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data, total, page, limit, totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ── slug.util.ts ──────────────────────────────────────────────

export function createSlug(text: string): string {
  return (slugifyLib as any)(text, {
    lower: true, strict: true, trim: true,
  });
}

// ── geo.util.ts ───────────────────────────────────────────────
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R   = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number { return (deg * Math.PI) / 180; }
