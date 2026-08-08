import {
  BadRequestException,
  Controller,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Webhook } from 'svix';
import { UsersService } from '../users/users.service';

// The subset of Clerk's user.created / user.updated payload we care
// about. Clerk sends far more; we only need an id and a primary email.
interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    primary_email_address_id?: string | null;
    email_addresses?: { id: string; email_address: string }[];
  };
}

// Deliberately NOT behind ClerkAuthGuard: Clerk calls this endpoint
// server-to-server with no user session and no bearer token. Its
// authenticity comes from the Svix signature headers instead, which is
// why skipping that check would leave an open "create any user" endpoint.
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async handle(@Req() request: RawBodyRequest<Request>) {
    // Signature verification MUST run against the exact bytes Clerk
    // signed. Nest's JSON parser would hand us a re-serialized object
    // whose key order and whitespace may differ, so main.ts enables
    // `rawBody: true` and we verify that buffer instead.
    const payload = request.rawBody;
    if (!payload) {
      throw new BadRequestException('Missing raw request body');
    }

    const event = this.verify(payload, request.headers);

    // user.updated is handled identically to user.created because
    // upsertFromAuth is idempotent — an email change just overwrites.
    if (event.type === 'user.created' || event.type === 'user.updated') {
      const email = this.primaryEmail(event);
      await this.usersService.upsertFromAuth(event.data.id, email);
      this.logger.log(`${event.type}: provisioned ${event.data.id}`);
    }

    // Always 200 for events we don't handle. A non-2xx makes Svix retry
    // with backoff, and retrying an event we deliberately ignore is just
    // noise.
    return { received: true };
  }

  private verify(payload: Buffer, headers: Request['headers']): ClerkUserEvent {
    const secret = this.configService.getOrThrow<string>(
      'CLERK_WEBHOOK_SIGNING_SECRET',
    );

    try {
      return new Webhook(secret).verify(payload.toString('utf8'), {
        'svix-id': headers['svix-id'] as string,
        'svix-timestamp': headers['svix-timestamp'] as string,
        'svix-signature': headers['svix-signature'] as string,
      }) as ClerkUserEvent;
    } catch {
      // Log loudly: in practice this is almost always a signing secret
      // that doesn't match the endpoint it was copied from.
      this.logger.warn('Rejected a webhook with an invalid signature');
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  // Clerk sends every address the user has; the primary one is singled
  // out by id. Falling back to the first address keeps provisioning
  // working for OAuth sign-ups that arrive without a primary set yet.
  private primaryEmail(event: ClerkUserEvent): string {
    const addresses = event.data.email_addresses ?? [];
    const primary = addresses.find(
      (a) => a.id === event.data.primary_email_address_id,
    );
    return primary?.email_address ?? addresses[0]?.email_address ?? '';
  }
}
