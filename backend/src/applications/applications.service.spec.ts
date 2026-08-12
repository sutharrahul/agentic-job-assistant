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
  // Never generated yet — the tests that care about the "already generated"
  // path override this on prisma.application.findFirst.
  interviewPrep: null as unknown,
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
  ['update', (service) => service.update(APP_ID, INTRUDER, { coverLetter: 'mine now' })],
  ['remove', (service) => service.remove(APP_ID, INTRUDER)],
  ['analyzeFit', (service) => service.analyzeFit(APP_ID, INTRUDER)],
  [
    'generateCoverLetter',
    (service) => service.generateCoverLetter(APP_ID, INTRUDER, 'FORMAL'),
  ],
  ['generateInterviewPrep', (service) => service.generateInterviewPrep(APP_ID, INTRUDER)],
  ['addNote', (service) => service.addNote(APP_ID, INTRUDER, 'a note')],
  ['deleteNote', (service) => service.deleteNote(APP_ID, INTRUDER, 'note_1')],
  [
    'createInterviewRound',
    (service) =>
      service.createInterviewRound(APP_ID, INTRUDER, {
        type: 'Technical',
        mode: 'VIDEO',
        scheduledAt: '2026-09-01T10:00:00.000Z',
      }),
  ],
  [
    'updateInterviewRound',
    (service) =>
      service.updateInterviewRound(APP_ID, INTRUDER, 'round_1', { selfRating: 4 }),
  ],
  [
    'deleteInterviewRound',
    (service) => service.deleteInterviewRound(APP_ID, INTRUDER, 'round_1'),
  ],
];

describe('ApplicationsService authorization', () => {
  let service: ApplicationsService;
  let prisma: {
    application: Record<string, jest.Mock>;
    resume: Record<string, jest.Mock>;
    interviewRound: Record<string, jest.Mock>;
  };
  let orchestration: Record<string, jest.Mock>;

  // Interview rounds are listed here even though today's control flow can't
  // reach them past a failed findOne — that's exactly the point: if someone
  // later reorders a round write above the ownership check, this catches it.
  const writes = () => [
    prisma.application.create,
    prisma.application.update,
    prisma.application.delete,
    prisma.interviewRound.create,
    prisma.interviewRound.update,
    prisma.interviewRound.delete,
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
      interviewRound: {
        // Read by createInterviewRound to number the new round.
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'round_1', applicationId: APP_ID }),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'round_1', applicationId: APP_ID }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'round_1', applicationId: APP_ID }),
        delete: jest
          .fn()
          .mockResolvedValue({ id: 'round_1', applicationId: APP_ID }),
      },
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
        study_topics: [],
        questions: [],
        focus_areas: [],
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
      include: { interviewRounds: { orderBy: { scheduledAt: 'asc' } } },
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
        include: { interviewRounds: { orderBy: { scheduledAt: 'asc' } } },
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
      include: { interviewRounds: { orderBy: { scheduledAt: 'asc' } } },
    });
    expect(prisma.application.update.mock.calls[0][0].where).toStrictEqual({
      id: APP_ID,
    });
  });

  it('deletes only after the scoped read has authorized it', async () => {
    await expect(service.remove(APP_ID, OWNER)).resolves.toEqual({ deleted: true });

    expect(prisma.application.findFirst).toHaveBeenCalledWith({
      where: { id: APP_ID, userId: OWNER },
      include: { interviewRounds: { orderBy: { scheduledAt: 'asc' } } },
    });
    expect(prisma.application.delete).toHaveBeenCalledWith({ where: { id: APP_ID } });
  });

  describe('interview round scoping', () => {
    // The generic scopedOperations loop above only proves "the application
    // isn't owned by the caller" — it can't reach this failure mode, where
    // the application IS owned but the round id belongs to some other
    // application (possibly even another one of the caller's own).
    it('updateInterviewRound throws NotFound when the round does not belong to this application', async () => {
      prisma.interviewRound.findFirst.mockResolvedValue(null);

      await expect(
        service.updateInterviewRound(APP_ID, OWNER, 'round_1', { selfRating: 4 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.interviewRound.update).not.toHaveBeenCalled();
    });

    it('deleteInterviewRound throws NotFound when the round does not belong to this application', async () => {
      prisma.interviewRound.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteInterviewRound(APP_ID, OWNER, 'round_1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.interviewRound.delete).not.toHaveBeenCalled();
    });

    it('scopes the round lookup to both the round id and the application id', async () => {
      await service.updateInterviewRound(APP_ID, OWNER, 'round_1', { selfRating: 4 });

      expect(prisma.interviewRound.findFirst).toHaveBeenCalledWith({
        where: { id: 'round_1', applicationId: APP_ID },
      });
    });
  });

  // The frontend replaces its whole app object with whatever a mutation
  // returns, and its Application type declares interviewRounds non-optional
  // — so a mutation that forgets the include hands back a row where
  // interviewRounds is undefined and the detail page's
  // `app.interviewRounds.length` gate throws. This shipped broken once
  // (PATCH and addNote both omitted it); asserting it per-mutation is what
  // stops it coming back one method at a time.
  describe('every mutation returns the rounds relation', () => {
    const mutations: Array<[string, ScopedCall]> = [
      ['update', (s) => s.update(APP_ID, OWNER, { coverLetter: 'x' })],
      ['addNote', (s) => s.addNote(APP_ID, OWNER, 'a note')],
      ['deleteNote', (s) => s.deleteNote(APP_ID, OWNER, 'note_1')],
      ['analyzeFit', (s) => s.analyzeFit(APP_ID, OWNER)],
      ['generateCoverLetter', (s) => s.generateCoverLetter(APP_ID, OWNER, 'FORMAL')],
      ['generateInterviewPrep', (s) => s.generateInterviewPrep(APP_ID, OWNER)],
    ];

    it.each(mutations)('%s includes interviewRounds in its update', async (_n, invoke) => {
      await invoke(service);

      expect(prisma.application.update).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { interviewRounds: { orderBy: { scheduledAt: 'asc' } } },
        }),
      );
    });

    it('create includes interviewRounds too', async () => {
      await service.create(OWNER, {
        company: 'Acme',
        jobTitle: 'BE',
        jobDescription: 'x',
      });

      expect(prisma.application.create).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { interviewRounds: { orderBy: { scheduledAt: 'asc' } } },
        }),
      );
    });
  });

  describe('interview prep persistence', () => {
    const storedPrep = {
      studyTopics: [],
      questions: [],
      generatedAt: '2026-08-01T00:00:00.000Z',
    };

    // The whole point of persisting the pack: a page refresh, a reopen, a
    // stage change or a new interview round all hit this method again, and
    // none of them may spend the two LLM calls a generation costs.
    it('returns the stored pack without calling the AI when one already exists', async () => {
      prisma.application.findFirst.mockResolvedValue({
        ...ownedApplication,
        interviewPrep: storedPrep,
      });

      const result = await service.generateInterviewPrep(APP_ID, OWNER);

      expect(orchestration.generateInterviewPrep).not.toHaveBeenCalled();
      expect(prisma.application.update).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({ id: APP_ID, interviewPrep: storedPrep }),
      );
    });

    it('calls the AI for an existing pack only when regenerate is explicitly true', async () => {
      prisma.application.findFirst.mockResolvedValue({
        ...ownedApplication,
        interviewPrep: storedPrep,
      });

      await service.generateInterviewPrep(APP_ID, OWNER, true);

      expect(orchestration.generateInterviewPrep).toHaveBeenCalledTimes(1);
      expect(prisma.application.update).toHaveBeenCalledTimes(1);
    });

    it('generates and persists the first time, with nothing stored yet', async () => {
      orchestration.generateInterviewPrep.mockResolvedValue({
        study_topics: [
          {
            topic: 'Postgres indexing',
            category: 'Databases',
            priority: 'HIGH',
            difficulty: 'INTERMEDIATE',
            relevance: 'The JD names Postgres',
          },
        ],
        questions: [
          {
            question: 'How did you model that schema?',
            grounded_in: 'Resume: NestJS, Postgres',
            talking_points: ['Normalization'],
          },
        ],
        focus_areas: [
          {
            area: 'Query performance',
            why: 'The JD leads with scaling a Postgres-backed API',
            priority: 'HIGH',
          },
        ],
      });

      await service.generateInterviewPrep(APP_ID, OWNER);

      expect(orchestration.generateInterviewPrep).toHaveBeenCalledTimes(1);
      // snake_case off the wire -> camelCase in the column, plus the
      // generatedAt stamp the stored copy is dated by.
      const persisted = prisma.application.update.mock.calls[0][0].data
        .interviewPrep as Record<string, unknown>;
      expect(persisted.studyTopics).toEqual([
        {
          topic: 'Postgres indexing',
          category: 'Databases',
          priority: 'HIGH',
          difficulty: 'INTERMEDIATE',
          relevance: 'The JD names Postgres',
        },
      ]);
      expect(persisted.questions).toEqual([
        {
          question: 'How did you model that schema?',
          groundedIn: 'Resume: NestJS, Postgres',
          talkingPoints: ['Normalization'],
        },
      ]);
      // The third field of the pack — same snake_case -> camelCase mapping
      // as the two above, and stored alongside them rather than in a column
      // of its own because it is regenerated with them as one unit.
      expect(persisted.focusAreas).toEqual([
        {
          area: 'Query performance',
          why: 'The JD leads with scaling a Postgres-backed API',
          priority: 'HIGH',
        },
      ]);
      expect(typeof persisted.generatedAt).toBe('string');
    });
  });

  // studyProgress is the ONE part of the prep pack the user owns, so it
  // lives in its own column and rides the plain PATCH rather than any AI
  // route — which means update() has to pass the map straight through
  // untouched, keys and all.
  describe('study progress', () => {
    const progress = {
      'Databases::Postgres indexing': 'COMPLETED',
      'System Design::Caching': 'IN_PROGRESS',
    };

    it('round-trips the whole progress map through update()', async () => {
      await service.update(APP_ID, OWNER, { studyProgress: progress });

      expect(prisma.application.update.mock.calls[0][0].data.studyProgress)
        .toEqual(progress);
    });

    it('leaves studyProgress alone on a PATCH that does not mention it', async () => {
      // Absent field must stay absent, not arrive as null/{} — that would
      // wipe the user's ticks on every unrelated status change.
      await service.update(APP_ID, OWNER, { status: 'INTERVIEW' });

      expect(
        prisma.application.update.mock.calls[0][0].data,
      ).not.toHaveProperty('studyProgress');
    });
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
