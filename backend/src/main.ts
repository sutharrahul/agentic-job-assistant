import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true keeps the unparsed request body around alongside the
  // parsed one. Only the Clerk webhook needs it — Svix signs the exact
  // bytes it sent, and re-serializing the parsed JSON can change key
  // order or whitespace enough to break the signature check. See
  // webhooks/clerk-webhook.controller.ts.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Sets the standard set of protective response headers (X-Content-Type-Options,
  // Strict-Transport-Security, etc.) — NestJS's own recommended production
  // hardening step. Default config only, no CSP: this is a pure JSON API with
  // no HTML views of its own to lock down.
  app.use(helmet());

  // CORS is locked to FRONTEND_URL, not "*" — this API should only ever
  // be called by our own Next.js app (from the browser) or by server-side
  // code, never by an arbitrary third-party site.
  //
  // getOrThrow, NOT process.env: an unset FRONTEND_URL would pass
  // `origin: undefined` to enableCors, which reflects ANY origin — the
  // exact opposite of what this line is for, and silent. Better to
  // refuse to boot than to boot wide open.
  const configService = app.get(ConfigService);
  app.enableCors({
    origin: configService.getOrThrow<string>('FRONTEND_URL'),
    credentials: true,
  });
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
