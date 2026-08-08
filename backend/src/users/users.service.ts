import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByAuthId(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Supabase Auth creates a user (and issues a JWT) the moment someone
  // signs up — but that identity only exists in Supabase's own
  // auth.users table, not in OUR `User` table. Nothing else in this
  // backend creates that row automatically (no DB trigger/webhook is set
  // up), so the frontend calls this once right after a successful
  // login/signup. It's an upsert, not a plain create, because it's safe
  // (and cheap) to call on every login — first login creates the row,
  // every login after that is a no-op update.
  upsertFromAuth(id: string, email: string) {
    return this.prisma.user.upsert({
      where: { id },
      update: { email },
      create: { id, email },
    });
  }
}
