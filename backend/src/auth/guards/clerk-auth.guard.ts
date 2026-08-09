import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { verifyToken } from '@clerk/backend';

export interface ClerkJwtPayload {
  // Clerk's user id ("user_2abc..."). This is also the primary key of our
  // own User row — see the User model in schema.prisma.
  sub: string;
  // NOT part of Clerk's default session token. It's added as a custom
  // claim in the Clerk dashboard (Sessions -> Customize session token)
  // so provisioning a user row doesn't need a Clerk API round trip on
  // every request. Optional here because a misconfigured dashboard
  // shouldn't crash the guard — UsersService falls back to ''.
  email?: string;
}

// A "Guard" is a NestJS concept: a class that runs BEFORE a route handler
// and decides whether the request is allowed through. Attach it with
// @UseGuards(ClerkAuthGuard) — see users.controller.ts.
//
// Unlike the Supabase guard this replaces, Clerk signs its JWTs with
// RS256 and publishes the public keys at a JWKS endpoint, so there is no
// shared secret to compare against. verifyToken() fetches and caches
// that key set, then checks the signature and expiry locally — still no
// per-request network call to Clerk once the keys are cached.
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly secretKey: string;

  // Resolved once at construction, NOT per request inside the try below.
  // getOrThrow throws when the key is missing, and inside that try the
  // catch would have turned it into "401 Invalid or expired token" — so a
  // forgotten CLERK_SECRET_KEY on the host would look like a healthy app
  // rejecting every valid token, with nothing in the logs to say why.
  // Here it fails at boot instead, which is the loud, obvious failure.
  constructor(configService: ConfigService) {
    this.secretKey = configService.getOrThrow<string>('CLERK_SECRET_KEY');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await verifyToken(token, { secretKey: this.secretKey });

      // Stash the identity on the request so handlers can read it via
      // @CurrentUser() instead of re-verifying. See current-user.decorator.ts.
      request.user = {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
      return true;
    } catch {
      // Deliberately opaque: "expired", "bad signature" and "wrong secret
      // configured" all collapse to one message so nothing is leaked to a
      // caller. The trade-off is that a misconfigured CLERK_SECRET_KEY
      // looks identical to a genuinely invalid token.
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | undefined {
    // Expected header shape: "Authorization: Bearer <token>"
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
