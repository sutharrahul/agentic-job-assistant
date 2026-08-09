import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, type ClerkClient } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly clerk: ClerkClient;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.clerk = createClerkClient({
      secretKey: configService.getOrThrow<string>('CLERK_SECRET_KEY'),
    });
  }

  findByAuthId(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // Clerk creates a user (and issues a JWT) the moment someone signs up,
  // but that identity lives in Clerk, not in OUR `User` table — and
  // every Resume/Application row has a foreign key to it.
  //
  // Two things call this, deliberately: the Clerk user.created webhook
  // (the authoritative path, which always carries the address) and
  // POST /users/sync (the fallback, for the window before the webhook
  // arrives). It's an upsert so whichever gets there first wins.
  //
  // `email` is OPTIONAL because the sync path can't guarantee it: the
  // address only reaches the JWT if the session-token claim has been
  // configured in the Clerk dashboard, which is a manual step. This
  // method must not turn that misconfiguration into corrupt data —
  // see resolveEmail() and the update rule below.
  async upsertFromAuth(id: string, email?: string) {
    const resolved = await this.resolveEmail(id, email);

    return this.prisma.user.upsert({
      where: { id },
      // Only overwrite an existing address when we actually know one.
      // Previously this wrote `email: ''` unconditionally, which meant a
      // user provisioned correctly by the webhook had their real address
      // destroyed by the very next page load, since UserSync fires on
      // every mount.
      update: resolved ? { email: resolved } : {},
      // `email` is NOT NULL and @unique, so a blank fallback is not an
      // option: the FIRST user would store '' and the SECOND would fail
      // the unique index with P2002 — an unhandled 500 that surfaces to
      // the user only later, as a foreign-key failure on their first
      // upload. The Clerk id is unique, so this placeholder can never
      // collide, and it's obviously synthetic rather than a real address.
      create: { id, email: resolved ?? `${id}@no-email.invalid` },
    });
  }

  // Prefer the address the caller already has (the webhook payload, or
  // the JWT claim) and only call Clerk when it's missing. That keeps the
  // normal path free of network calls while making the feature work even
  // if the dashboard claim was never configured.
  private async resolveEmail(
    id: string,
    email?: string,
  ): Promise<string | undefined> {
    const given = email?.trim();
    if (given) return given;

    try {
      const user = await this.clerk.users.getUser(id);
      const primary = user.emailAddresses.find(
        (address) => address.id === user.primaryEmailAddressId,
      );
      const found = primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

      if (found) return found;
      this.logger.warn(`Clerk user ${id} has no email address on record`);
    } catch (error) {
      // Never block provisioning on this. A user with a placeholder
      // address still gets a row, so their uploads work; the address can
      // be corrected by any later sync or user.updated webhook.
      this.logger.warn(
        `Could not fetch email for ${id} from Clerk: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return undefined;
  }
}
