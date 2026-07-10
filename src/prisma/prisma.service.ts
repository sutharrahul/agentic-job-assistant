import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

// This class doesn't add any new methods — it IS a PrismaClient (that's
// what `extends PrismaClient` means), just wrapped so NestJS can manage
// its lifecycle. Elsewhere in the app, `this.prisma.user.findMany(...)`
// etc. all come straight from Prisma's generated client.
//
// OnModuleInit/OnModuleDestroy are lifecycle hooks NestJS calls
// automatically on every provider that implements them. We use them to
// connect to Postgres when the app starts and disconnect when it shuts
// down. Prisma *would* connect lazily on the first query without this,
// but then a bad DATABASE_URL only surfaces when the first real request
// comes in — connecting eagerly here means the app fails to start (loud,
// obvious) instead of failing on someone's first API call (quiet,
// confusing).
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
