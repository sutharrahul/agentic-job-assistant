import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/guards/supabase-auth.guard';
import { UsersService } from './users.service';

// @UseGuards on the CLASS (not each method) protects every route in this
// controller — SupabaseAuthGuard runs before any of them.
@Controller('users')
@UseGuards(SupabaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: SupabaseJwtPayload) {
    // user.sub is the "subject" claim of the JWT — Supabase's term for
    // "which user this token belongs to." It's the same UUID as this
    // user's row id in our own database (see the User model in
    // schema.prisma for why).
    return this.usersService.findByAuthId(user.sub);
  }
}
