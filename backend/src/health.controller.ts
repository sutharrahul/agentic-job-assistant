import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, hours, minutes } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';
import { UserThrottlerGuard } from './throttler/user-throttler.guard';

// Deliberately UNGUARDED: these are the endpoints the host (Render) pings
// to decide whether the service is up, and the scheduled ping that keeps
// a free-tier instance from sleeping. Neither caller can authenticate, so
// requiring auth here would defeat the purpose.
//
// The GET / handler is also dependency-free — it must not touch the
// database or the AI service, because a slow dependency would make a
// healthy process look dead and get it restarted. GET /db deliberately
// breaks that rule, and pays for it with a rate limit; see below.
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return { status: 'ok' };
  }

  // A SEPARATE endpoint, precisely because the one above must stay
  // dependency-free. Two different questions get two different answers:
  // "is the process alive" (above) and "can it still reach Postgres".
  //
  // The reason this exists at all: a free-tier Supabase project pauses
  // itself after about a week with no queries, and the liveness ping
  // deliberately issues none — so the database could quietly go away
  // while the service kept reporting itself healthy. A scheduled call
  // here every few hours is enough of a query to keep it awake, and it
  // surfaces a paused database as a 503 instead of as a failed upload.
  //
  // Rate limited because, unlike GET /, this one is unauthenticated AND
  // hits the database — without a cap, anyone who found the URL could
  // loop it and exhaust a free-tier Postgres connection pool from the
  // outside. The limits are sized for its only real caller: a cron job
  // running every few hours. UserThrottlerGuard falls back to keying on
  // IP when there's no authenticated user, which is exactly this case.
  @UseGuards(UserThrottlerGuard)
  @Throttle({
    short: { ttl: minutes(1), limit: 4 },
    daily: { ttl: hours(24), limit: 200 },
  })
  @Get('db')
  async checkDb() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      this.logger.error(
        `Database health check failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException('Database is unreachable.');
    }
  }
}
