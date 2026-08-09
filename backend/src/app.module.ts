import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, hours, minutes } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';
import { ResumesModule } from './resumes/resumes.module';
import { ApplicationsModule } from './applications/applications.module';
import { OrchestrationModule } from './orchestration/orchestration.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    // isGlobal: true means every module can inject ConfigService (used
    // for reading env vars like CLERK_SECRET_KEY, AI_SERVICE_URL)
    // without importing ConfigModule itself — same idea as PrismaModule
    // being @Global(), just for a different Nest module.
    ConfigModule.forRoot({ isGlobal: true }),
    // Two windows, because one isn't enough to protect a free-tier LLM
    // quota: a per-minute cap alone still permits thousands of calls a
    // day. "short" stops someone holding down Regenerate; "daily" caps
    // what any single account can burn in total.
    //
    // These are the GENEROUS baselines for ordinary CRUD. The AI routes
    // override both with much tighter numbers via @Throttle — see
    // applications.controller.ts.
    //
    // Storage is in-memory: counters reset when the process restarts and
    // aren't shared between instances. Fine for a single free-tier
    // instance; a multi-instance deployment would need Redis-backed
    // storage to be accurate.
    ThrottlerModule.forRoot([
      { name: 'short', ttl: minutes(1), limit: 60 },
      { name: 'daily', ttl: hours(24), limit: 2000 },
    ]),
    AuthModule,
    PrismaModule,
    SupabaseModule,
    UsersModule,
    ResumesModule,
    ApplicationsModule,
    OrchestrationModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
