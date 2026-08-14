import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ResumesService } from './resumes.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { OrchestrationService } from '../orchestration/orchestration.service';
import { UsersService } from '../users/users.service';

const OWNER = 'user_owner';
const INTRUDER = 'user_intruder';
const RESUME_ID = 'res_1';

const ownedResume = {
  id: RESUME_ID,
  userId: OWNER,
  fileName: 'rahul-resume.pdf',
  storagePath: `${OWNER}/abc-rahul-resume.pdf`,
  status: 'CONFIRMED',
};

// fileUrl() is the only route that converts an id the caller typed into a
// URL that reaches a private file directly — Supabase serves it without
// going through this API again. So the scoping is worth its own suite:
// a leak here isn't a wrong response body, it's someone else's resume.
describe('ResumesService.fileUrl', () => {
  let service: ResumesService;
  let prisma: { resume: { findFirst: jest.Mock } };
  let supabase: { createSignedUrl: jest.Mock };

  beforeEach(async () => {
    prisma = { resume: { findFirst: jest.fn() } };
    supabase = { createSignedUrl: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ResumesService,
        { provide: PrismaService, useValue: prisma },
        { provide: SupabaseService, useValue: supabase },
        { provide: OrchestrationService, useValue: {} },
        { provide: UsersService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(ResumesService);
  });

  it('returns a signed url for a resume the caller owns', async () => {
    prisma.resume.findFirst.mockResolvedValue(ownedResume);
    supabase.createSignedUrl.mockResolvedValue('https://signed.example/abc');

    await expect(service.fileUrl(RESUME_ID, OWNER)).resolves.toEqual({
      url: 'https://signed.example/abc',
      fileName: 'rahul-resume.pdf',
    });
  });

  it('scopes the lookup to the caller, not the id alone', async () => {
    prisma.resume.findFirst.mockResolvedValue(ownedResume);
    supabase.createSignedUrl.mockResolvedValue('https://signed.example/abc');

    await service.fileUrl(RESUME_ID, OWNER);

    expect(prisma.resume.findFirst).toHaveBeenCalledWith({
      where: { id: RESUME_ID, userId: OWNER },
    });
  });

  it('404s for a resume belonging to someone else', async () => {
    // What the scoped query actually returns for a non-owner.
    prisma.resume.findFirst.mockResolvedValue(null);

    await expect(service.fileUrl(RESUME_ID, INTRUDER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // The important half of the previous test: refusing is worthless if a
  // live URL was already minted on the way to refusing.
  it('mints no url at all when the caller is not the owner', async () => {
    prisma.resume.findFirst.mockResolvedValue(null);

    await expect(service.fileUrl(RESUME_ID, INTRUDER)).rejects.toThrow();

    expect(supabase.createSignedUrl).not.toHaveBeenCalled();
  });

  // The storage path must come from the row, never from the request —
  // otherwise a crafted id could address any object in the bucket.
  it('signs the path stored on the row, not anything caller-supplied', async () => {
    prisma.resume.findFirst.mockResolvedValue(ownedResume);
    supabase.createSignedUrl.mockResolvedValue('https://signed.example/abc');

    await service.fileUrl(RESUME_ID, OWNER);

    expect(supabase.createSignedUrl).toHaveBeenCalledWith(
      ownedResume.storagePath,
    );
  });
});
