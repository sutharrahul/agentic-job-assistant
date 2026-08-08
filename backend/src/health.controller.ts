import { Controller, Get } from '@nestjs/common';

// Deliberately UNGUARDED and dependency-free: this is the endpoint the
// host (Render) pings to decide whether the service is up, and it runs
// before any user is authenticated. It must not touch the database or
// the AI service — a slow dependency would make a healthy process look
// dead and get it restarted.
//
// It also doubles as the cheapest way to wake a sleeping free-tier
// instance before a demo, so the first real request doesn't eat the
// cold-start delay.
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
