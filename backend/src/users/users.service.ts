import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByAuthId(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Clerk creates a user (and issues a JWT) the moment someone signs up,
  // but that identity lives in Clerk, not in OUR `User` table — and
  // every Resume/Application row has a foreign key to it.
  //
  // Two things call this, deliberately: the Clerk user.created webhook
  // (the authoritative path) and POST /users/sync (the fallback, for the
  // window before the webhook arrives). That's why it's an upsert rather
  // than a create — whichever gets there first wins, and the second is a
  // harmless no-op instead of a duplicate-key crash.
  upsertFromAuth(id: string, email: string) {
    return this.prisma.user.upsert({
      where: { id },
      update: { email },
      create: { id, email },
    });
  }
}
