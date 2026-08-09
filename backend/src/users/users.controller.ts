import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { ClerkJwtPayload } from '../auth/guards/clerk-auth.guard';
import { UsersService } from './users.service';

// @UseGuards on the CLASS (not each method) protects every route in this
// controller — ClerkAuthGuard runs before any of them.
@Controller('users')
@UseGuards(ClerkAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: ClerkJwtPayload) {
    // user.sub is the "subject" claim of the JWT — the standard term for
    // "which user this token belongs to." Clerk puts its user id there,
    // and that id is also this user's row id in our own database (see
    // the User model in schema.prisma for why).
    return this.usersService.findByAuthId(user.sub);
  }

  // The safety net for webhook provisioning. The Clerk user.created
  // webhook is the authoritative path, but it's asynchronous: a user can
  // sign up, get redirected, and have the frontend issue its first
  // authenticated request before Clerk's webhook has landed — which
  // would fail the Resume.userId -> User.id foreign key on their very
  // first upload. The frontend calls this once after sign-in so the row
  // is guaranteed to exist either way.
  //
  // It's an upsert, so calling it on every sign-in is harmless, and it
  // also means local development works without exposing a webhook
  // endpoint to the internet at all.
  @Post('sync')
  sync(@CurrentUser() user: ClerkJwtPayload) {
    // Pass the claim through as-is, including undefined. UsersService
    // resolves a missing address from Clerk rather than substituting a
    // blank one, which used to collide with User.email's unique index on
    // the second user to sign up.
    return this.usersService.upsertFromAuth(user.sub, user.email);
  }
}
