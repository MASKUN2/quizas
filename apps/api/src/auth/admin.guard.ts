import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { isAdminToken } from './is-admin';

/**
 * Protects write endpoints. Requires `Authorization: Bearer <ADMIN_TOKEN>`.
 * Single-author blog: one shared admin token, configured via env.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!this.config.get<string>('ADMIN_TOKEN')) {
      throw new UnauthorizedException('Admin token is not configured');
    }
    if (!isAdminToken(request.headers.authorization, this.config)) {
      throw new UnauthorizedException('Invalid or missing admin token');
    }
    return true;
  }
}
