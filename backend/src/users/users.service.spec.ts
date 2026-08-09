import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

// The Clerk client is built in the constructor, so it has to be replaced
// at the module level rather than injected. Only getUser() is reached by
// this service.
const mockGetUser = jest.fn();
jest.mock('@clerk/backend', () => ({
  createClerkClient: jest.fn(() => ({ users: { getUser: mockGetUser } })),
}));

const CLERK_ID = 'user_2abcXYZ';

describe('UsersService.upsertFromAuth', () => {
  let service: UsersService;
  let upsert: jest.Mock;

  beforeAll(() => {
    // resolveEmail warns on every miss; those misses are the point of
    // half these tests, so keep them out of the output.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    upsert = jest.fn().mockResolvedValue({ id: CLERK_ID });
    mockGetUser.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: { user: { upsert } } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('sk_test_key') },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  // The arguments Prisma is handed ARE the behaviour under test here —
  // the update/create split is the whole fix.
  const upsertArgs = () => upsert.mock.calls[0][0];

  describe('the update rule', () => {
    it('writes the address when one is known', async () => {
      await service.upsertFromAuth(CLERK_ID, 'rahul@example.com');

      expect(upsertArgs().where).toStrictEqual({ id: CLERK_ID });
      expect(upsertArgs().update).toStrictEqual({ email: 'rahul@example.com' });
    });

    it('leaves update EMPTY when no address can be resolved', async () => {
      // The data-corruption bug: this used to write `email: ''`
      // unconditionally, so a user provisioned correctly by the Clerk
      // webhook had their real address destroyed by the next page load
      // (UserSync fires on every mount). An empty update object is the
      // only correct behaviour — never a blank overwrite.
      mockGetUser.mockRejectedValue(new Error('Clerk unreachable'));

      await service.upsertFromAuth(CLERK_ID);

      // toStrictEqual, not toEqual: toEqual would also accept
      // `{ email: undefined }`, which is exactly the regression shape
      // this test exists to catch.
      expect(upsertArgs().update).toStrictEqual({});
    });
  });

  describe('the create fallback', () => {
    it('uses a synthetic per-user address when no email is known', async () => {
      // Not '': email is NOT NULL and @unique, so a blank would let the
      // FIRST user through and fail the SECOND with P2002 — a 500 that
      // only surfaces later, as a foreign-key error on their first
      // upload. The Clerk id is unique, so this can never collide.
      mockGetUser.mockResolvedValue({
        primaryEmailAddressId: null,
        emailAddresses: [],
      });

      await service.upsertFromAuth(CLERK_ID);

      expect(upsertArgs().create).toStrictEqual({
        id: CLERK_ID,
        email: `${CLERK_ID}@no-email.invalid`,
      });
    });

    it('uses the real address when one is known', async () => {
      await service.upsertFromAuth(CLERK_ID, 'rahul@example.com');

      expect(upsertArgs().create).toStrictEqual({
        id: CLERK_ID,
        email: 'rahul@example.com',
      });
    });
  });

  describe('resolving the address', () => {
    it('prefers the caller-supplied address and never calls Clerk', async () => {
      // The webhook and the JWT claim already carry the address; a
      // network round trip per resume upload would be pure waste.
      await service.upsertFromAuth(CLERK_ID, 'rahul@example.com');

      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it('falls back to Clerk when the caller has no address', async () => {
      // This is the path that keeps the feature working when the email
      // claim was never configured in the Clerk dashboard.
      mockGetUser.mockResolvedValue({
        primaryEmailAddressId: 'idn_primary',
        emailAddresses: [{ id: 'idn_primary', emailAddress: 'from-clerk@example.com' }],
      });

      await service.upsertFromAuth(CLERK_ID);

      expect(mockGetUser).toHaveBeenCalledWith(CLERK_ID);
      expect(upsertArgs().update).toStrictEqual({ email: 'from-clerk@example.com' });
    });

    it('picks the primary address, not merely the first one on the account', async () => {
      mockGetUser.mockResolvedValue({
        primaryEmailAddressId: 'idn_primary',
        emailAddresses: [
          { id: 'idn_old', emailAddress: 'old@example.com' },
          { id: 'idn_primary', emailAddress: 'primary@example.com' },
        ],
      });

      await service.upsertFromAuth(CLERK_ID);

      expect(upsertArgs().update).toStrictEqual({ email: 'primary@example.com' });
    });

    it('treats a blank supplied address as missing', async () => {
      mockGetUser.mockResolvedValue({
        primaryEmailAddressId: 'idn_primary',
        emailAddresses: [{ id: 'idn_primary', emailAddress: 'from-clerk@example.com' }],
      });

      await service.upsertFromAuth(CLERK_ID, '   ');

      expect(mockGetUser).toHaveBeenCalledWith(CLERK_ID);
      expect(upsertArgs().update).toStrictEqual({ email: 'from-clerk@example.com' });
    });

    it('still provisions the user when the Clerk lookup throws', async () => {
      // Provisioning must never depend on Clerk being reachable: without
      // the row, the user's first upload fails on a foreign key. A
      // placeholder address is fixable by any later sync or webhook.
      mockGetUser.mockRejectedValue(new Error('Clerk 500'));

      await expect(service.upsertFromAuth(CLERK_ID)).resolves.toEqual({
        id: CLERK_ID,
      });
      expect(upsert).toHaveBeenCalledTimes(1);
    });
  });
});
