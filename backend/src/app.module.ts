import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    // for reading env vars like SUPABASE_JWT_SECRET, AI_SERVICE_URL)
    // without importing ConfigModule itself — same idea as PrismaModule
    // being @Global(), just for a different Nest module.
    ConfigModule.forRoot({ isGlobal: true }),
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
