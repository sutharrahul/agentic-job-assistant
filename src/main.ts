import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
