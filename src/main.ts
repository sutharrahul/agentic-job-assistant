import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { MOCK_JWT_PAYLOAD } from './auth/mock-user';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // DEV-ONLY AUTH BYPASS (see supabase-auth.guard.ts): when bypassed,
  // every request is treated as MOCK_JWT_PAYLOAD, but nothing else ever
  // creates a matching `User` row for it the way a real login would
  // (see UsersService.upsertFromAuth, normally called from the frontend
  // right after Supabase login/signup — which never happens in bypass
  // mode). Without this row, the first upload would fail a foreign-key
  // constraint (Resume.userId -> User.id). Doing it once here, at
  // startup, means it's ready before any request can need it.
  if (process.env.BYPASS_AUTH === 'true') {
    const prisma = app.get(PrismaService);
    await prisma.user.upsert({
      where: { id: MOCK_JWT_PAYLOAD.sub },
      update: {},
      create: { id: MOCK_JWT_PAYLOAD.sub, email: MOCK_JWT_PAYLOAD.email },
    });
  }

  // CORS is locked to FRONTEND_URL, not "*" — this API should only ever
  // be called by our own Next.js app (from the browser) or by server-side
  // code, never by an arbitrary third-party site.
  app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true });
  // Global ValidationPipe runs every request body through its DTO's
  // class-validator decorators (see ConfirmResumeDto) before the
  // controller method even runs. `whitelist: true` strips any property
  // NOT declared on the DTO instead of erroring — so extra fields the
  // frontend accidentally sends are silently dropped, not rejected.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // Default port is 3001, not 3000 — Next.js's dev server already owns
  // 3000, so both can run locally at once without a conflict.
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
