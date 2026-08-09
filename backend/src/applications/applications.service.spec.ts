import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestrationService } from '../orchestration/orchestration.service';

const OWNER = 'user_owner';
const INTRUDER = 'user_intruder';
const APP_ID = 'app_1';

const ownedApplication = {
  id: APP_ID,
  userId: OWNER,
  company: 'Acme',
  jobTitle: 'Backend Engineer',
  jobDescription: 'NestJS, Postgres',
  resumeId: null as string | null,
  skillGapAnalysis: null,
};

const confirmedResume = {
  id: 'res_latest',
  userId: OWNER,
  status: 'CONFIRMED',
  parsedData: { skills: ['NestJS'] },
};

type ScopedCall = (service: ApplicationsService) => Promise<unknown>;

// Every entry point that takes an id the caller could have guessed. The
// list is deliberately exhaustive: a new id-taking method added to the
// service should show up as a missing row here.
const scopedOperations: Array<[string, ScopedCall]> = [
  ['findOne', (service) => service.findOne(APP_ID, INTRUDER)],
  ['update', (service) => service.update(APP_ID, INTRUDER, { notes: 'mine now' })],
  ['remove', (service) => service.remove(APP_ID, INTRUDER)],
  ['analyzeFit', (service) => service.analyzeFit(APP_ID, INTRUDER)],
  [
    'generateCoverLetter',
    (service) => service.generateCoverLetter(APP_ID, INTRUDER, 'FORMAL'),
  ],
  ['generateInterviewPrep', (service) => service.generateInterviewPrep(APP_ID, INTRUDER)],
];

describe('ApplicationsService authorization', () => {
  let service: ApplicationsService;
  let prisma: {
    application: Record<string, jest.Mock>;
    resume: Record<string, jest.Mock>;
  };
  let orchestration: Record<string, jest.Mock>;

  const writes = () => [
    prisma.application.create,
    prisma.application.update,
    prisma.application.delete,
  ];

  beforeEach(async () => {
    prisma = {
      application: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(ownedApplication),
        create: jest.fn().mockResolvedValue(ownedApplication),
        update: jest.fn().mockResolvedValue(ownedApplication),
        delete: jest.fn().mockResolvedValue(ownedApplication),
      },
      resume: { findFirst: jest.fn().mockResolvedValue(confirmedResume) },
    };
    orchestration = {
      analyzeFit: jest.fn().mockResolvedValue({
        fit_score: 80,
        matched_skills: [],
        missing_skills: [],
        suggestions: [],
      }),
      generateCoverLetter: jest.fn().mockResolvedValue({ cover_letter: 'Dear...' }),
      generateInterviewPrep: jest.fn().mockResolvedValue({
        focus_areas: [],
        technical_questions: [],
        behavioral_questions: [],
        gaps_to_prepare: [],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrchestrationService, useValue: orchestration },
      ],
    }).compile();

    service = moduleRef.get(ApplicationsService);
  });

  it('scopes the list query to the caller', async () => {
    await service.findAllForUser(OWNER);

    expect(prisma.application.findMany).toHaveBeenCalledWith({
      where: { userId: OWNER },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('stamps the caller onto a new application, ignoring any id in the body', async () => {
    await service.create(OWNER, {
      company: 'Acme',
      jobTitle: 'Backend Engineer',
      jobDescription: 'NestJS, Postgres',
      userId: INTRUDER,
    } as never);

    expect(prisma.application.create.mock.calls[0][0].data.userId).toBe(OWNER);
  });

  it.each(scopedOperations)(
    '%s looks the row up scoped to the caller, never by id alone',
    async (_name, invoke) => {
      await invoke(service);

      expect(prisma.application.findFirst).toHaveBeenCalledWith({
        where: { id: APP_ID, userId: INTRUDER },
      });
    },
  );

  it.each(scopedOperations)(
    '%s throws NotFound when the row belongs to someone else',
    async (_name, invoke) => {
      // A 404 rather than a silent no-op or a 403: a no-op would tell the
      // caller nothing went wrong, and a 403 would confirm the id exists.
      prisma.application.findFirst.mockResolvedValue(null);

      await expect(invoke(service)).rejects.toBeInstanceOf(NotFoundException);

      // Nothing may reach the database or the (paid) AI service once the
      // ownership check has failed.
      for (const write of writes()) {
        expect(write).not.toHaveBeenCalled();
      }
      for (const call of Object.values(orchestration)) {
        expect(call).not.toHaveBeenCalled();
      }
    },
  );

  it('updates by id only after the scoped read has authorized it', async () => {
    // The Prisma update/delete themselves are keyed on id alone, so
    // findOne is the ONLY thing standing between an intruder and someone
    // else's row — that ordering is the security property, not an
    // implementation detail.
    await service.update(APP_ID, OWNER, { notes: 'called back' });

    expect(prisma.application.findFirst).toHaveBeenCalledWith({
      where: { id: APP_ID, userId: OWNER },
    });
    expect(prisma.application.update.mock.calls[0][0].where).toStrictEqual({
      id: APP_ID,
    });
  });

  it('deletes only after the scoped read has authorized it', async () => {
    await expect(service.remove(APP_ID, OWNER)).resolves.toEqual({ deleted: true });

    expect(prisma.application.findFirst).toHaveBeenCalledWith({
      where: { id: APP_ID, userId: OWNER },
    });
    expect(prisma.application.delete).toHaveBeenCalledWith({ where: { id: APP_ID } });
  });

  describe('resume selection for AI actions', () => {
    it('scopes the pinned resume to the caller as well as the application', async () => {
      // An application row carries a resumeId; without the userId here a
      // tampered-with row could pull another user's resume into an AI
      // call and leak it back in the response.
      prisma.application.findFirst.mockResolvedValue({
        ...ownedApplication,
        resumeId: 'res_pinned',
      });

      await service.analyzeFit(APP_ID, OWNER);

      expect(prisma.resume.findFirst).toHaveBeenCalledWith({
        where: { id: 'res_pinned', userId: OWNER, status: 'CONFIRMED' },
      });
    });

    it("falls back to the caller's own confirmed resume when the pinned one is not theirs", async () => {
      prisma.application.findFirst.mockResolvedValue({
        ...ownedApplication,
        resumeId: 'res_someone_elses',
      });
      prisma.resume.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(confirmedResume);

      await service.analyzeFit(APP_ID, OWNER);

      expect(prisma.resume.findFirst).toHaveBeenLastCalledWith({
        where: { userId: OWNER, status: 'CONFIRMED' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(prisma.application.update.mock.calls[0][0].data.resumeId).toBe(
        confirmedResume.id,
      );
    });
  });
});
