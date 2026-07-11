import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { MOCK_JWT_PAYLOAD } from '../mock-user';

export interface SupabaseJwtPayload extends jwt.JwtPayload {
  sub: string;
  email?: string;
}

// A "Guard" is a NestJS concept: a class that runs BEFORE a route
// handler and decides whether the request is allowed through
// (canActivate returns true) or gets rejected. We attach this one to
// controllers with @UseGuards(SupabaseAuthGuard) — see
// users.controller.ts for an example.
//
// Why we can verify the token ourselves instead of asking Supabase "is
// this token valid?" over the network: Supabase signs every JWT with a
// secret only Supabase and this backend know (SUPABASE_JWT_SECRET).
// jwt.verify() checks that signature locally — no network call, no
// added latency per request, and it still works if Supabase's API is
// temporarily down.
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // DEV-ONLY AUTH BYPASS — mirrors the frontend's
    // NEXT_PUBLIC_BYPASS_AUTH (frontend/src/lib/auth/auth-context.tsx).
    // This is a SEPARATE env var on THIS service, checked here instead
    // of trusting anything the client sends — a client can't fake its
    // way past this guard just because the frontend happens to be in
    // bypass mode; this backend has to be deliberately configured the
    // same way too. Skips real JWT verification entirely and pretends
    // every request came from MOCK_JWT_PAYLOAD.
    // !! MUST be "false" or unset in any shared/deployed environment !!
    if (this.configService.get<string>('BYPASS_AUTH') === 'true') {
      request.user = MOCK_JWT_PAYLOAD;
      return true;
    }

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const secret = this.configService.getOrThrow<string>(
        'SUPABASE_JWT_SECRET',
      );
      // jwt.verify throws if the signature doesn't match OR the token
      // has expired — both are treated as "not authenticated" below. We
      // don't tell the caller which one it was; that's deliberate (see
      // WALKTHROUGH.md "weak spots" — it's also a debugging trade-off).
      const payload = jwt.verify(token, secret) as SupabaseJwtPayload;
      // Stash the decoded payload on the request so route handlers can
      // read it via @CurrentUser() instead of re-verifying the token
      // themselves. See current-user.decorator.ts.
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | undefined {
    // Expected header shape: "Authorization: Bearer <token>"
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
