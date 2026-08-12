import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestrationService } from '../orchestration/orchestration.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import {
  CoverLetterTone,
  UpdateApplicationDto,
} from './dto/update-application.dto';
import {
  CreateInterviewRoundDto,
  UpdateInterviewRoundDto,
} from './dto/interview-round.dto';

// EVERY query that returns an application must carry this — reads and
// mutations alike. The frontend's Application type declares interviewRounds
// non-optional and replaces its whole app object with whatever a mutation
// returns, so an update that omits the include hands back a row whose
// interviewRounds is `undefined`, and the detail page's
// `app.interviewRounds.length` gate throws on the next render. Verified the
// hard way: PATCH /applications/:id and POST :id/notes both shipped without
// it and would have crashed the page after any status change or new note.
const WITH_ROUNDS = {
  interviewRounds: { orderBy: { scheduledAt: 'asc' } },
} as const;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrationService: OrchestrationService,
  ) {}

  findAllForUser(userId: string) {
    return this.prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: WITH_ROUNDS,
    });
  }

  // Scoped by userId so one user can never read/modify another user's
  // application by guessing ids — same pattern as ResumesService.findOne.
  async findOne(id: string, userId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, userId },
      include: WITH_ROUNDS,
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  create(userId: string, dto: CreateApplicationDto) {
    return this.prisma.application.create({
      data: {
        userId,
        company: dto.company,
        jobTitle: dto.jobTitle,
        jobDescription: dto.jobDescription,
        location: dto.location,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
      // Always an empty array here, but the frontend's Application type
      // declares interviewRounds non-optional — returning a row without it
      // would make this the one endpoint whose shape doesn't match.
      include: WITH_ROUNDS,
    });
  }

  async update(id: string, userId: string, dto: UpdateApplicationDto) {
    await this.findOne(id, userId);
    // Date fields arrive as strings in the JSON body but Prisma wants
    // Date objects — and "" means "the user cleared the input" (-> null).
    const { joiningDate, ...rest } = dto;
    return this.prisma.application.update({
      where: { id },
      data: {
        ...rest,
        joiningDate: this.toDateOrClear(joiningDate),
      },
          include: WITH_ROUNDS,
    });
  }

  // undefined = field absent from the PATCH, leave the column untouched;
  // "" = clear it; anything else = a validated ISO date string.
  private toDateOrClear(value: string | undefined): Date | null | undefined {
    if (value === undefined) return undefined;
    return value ? new Date(value) : null;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.application.delete({ where: { id } });
    return { deleted: true };
  }

  async addNote(id: string, userId: string, content: string) {
    const application = await this.findOne(id, userId);
    // Json is loosely typed on the Prisma side — guard against a
    // non-array value ever reaching .push/.filter below.
    const notes = Array.isArray(application.notes) ? application.notes : [];
    notes.push({ id: randomUUID(), content, createdAt: new Date().toISOString() });
    return this.prisma.application.update({
      where: { id },
      data: { notes },
      include: WITH_ROUNDS,
    });
  }

  async deleteNote(id: string, userId: string, noteId: string) {
    const application = await this.findOne(id, userId);
    const notes = Array.isArray(application.notes) ? application.notes : [];
    // No error if noteId isn't found — filtering is naturally idempotent.
    const remaining = notes.filter(
      (note) => (note as { id?: string })?.id !== noteId,
    );
    return this.prisma.application.update({
      where: { id },
      data: { notes: remaining },
      include: WITH_ROUNDS,
    });
  }

  // --- Interview rounds -------------------------------------------------

  async createInterviewRound(
    applicationId: string,
    userId: string,
    dto: CreateInterviewRoundDto,
  ) {
    await this.findOne(applicationId, userId);
    // Rounds are a real-world log, never an AI input or output — nothing on
    // this path (or the update/delete ones below) talks to the AI service.
    // The prep pack is generated once at the APPLICATION level and shared
    // by every round.
    //
    // The number is stamped once at creation rather than derived on read,
    // so deleting round 2 doesn't silently renumber round 3 out from under
    // a user who has already been calling it "round 3".
    const roundNumber =
      dto.roundNumber ??
      (await this.prisma.interviewRound.count({ where: { applicationId } })) + 1;
    await this.prisma.interviewRound.create({
      data: {
        applicationId,
        ...dto,
        roundNumber,
        scheduledAt: new Date(dto.scheduledAt),
      },
    });
    return this.findOne(applicationId, userId);
  }

  async updateInterviewRound(
    applicationId: string,
    userId: string,
    roundId: string,
    dto: UpdateInterviewRoundDto,
  ) {
    await this.findOne(applicationId, userId);
    // findOne above only proves the APPLICATION is the caller's. Rounds are
    // independently addressable by id, so without this second check a
    // caller could PATCH a round under a DIFFERENT applicationId (even one
    // of their own other applications) just by passing its id.
    const round = await this.prisma.interviewRound.findFirst({
      where: { id: roundId, applicationId },
    });
    if (!round) {
      throw new NotFoundException('Interview round not found');
    }
    const { scheduledAt, expectedResponseBy, ...rest } = dto;
    await this.prisma.interviewRound.update({
      where: { id: roundId },
      data: {
        ...rest,
        scheduledAt: scheduledAt !== undefined ? new Date(scheduledAt) : undefined,
        expectedResponseBy: this.toDateOrClear(expectedResponseBy),
      },
    });
    return this.findOne(applicationId, userId);
  }

  async deleteInterviewRound(applicationId: string, userId: string, roundId: string) {
    await this.findOne(applicationId, userId);
    // Same double-scoping as updateInterviewRound above — see comment there.
    const round = await this.prisma.interviewRound.findFirst({
      where: { id: roundId, applicationId },
    });
    if (!round) {
      throw new NotFoundException('Interview round not found');
    }
    await this.prisma.interviewRound.delete({ where: { id: roundId } });
    return this.findOne(applicationId, userId);
  }

  // --- AI actions -----------------------------------------------------
  // Each one: load the application + the user's confirmed resume, hand
  // both to the AI service via OrchestrationService, persist the result
  // on the application row, return the updated row. The FastAPI side is
  // stateless — every fact it needs travels in the request.

  async analyzeFit(id: string, userId: string) {
    const application = await this.findOne(id, userId);
    const resume = await this.getResumeForApplication(userId, application);

    const result = await this.orchestrationService.analyzeFit({
      parsed_resume: resume.parsedData,
      parsed_job: this.jobPayload(application),
    });

    return this.prisma.application.update({
      where: { id },
      data: {
        resumeId: resume.id,
        fitScore: result.fit_score,
        // snake_case (service boundary) -> camelCase (our DB/API shape).
        // This is the one deliberate mapping point — see the note on
        // skillGapAnalysis in schema.prisma.
        skillGapAnalysis: {
          matchedSkills: result.matched_skills,
          missingSkills: result.missing_skills,
          suggestions: result.suggestions,
        },
      },
      include: WITH_ROUNDS,
    });
  }

  async generateCoverLetter(id: string, userId: string, tone: CoverLetterTone) {
    const application = await this.findOne(id, userId);
    const resume = await this.getResumeForApplication(userId, application);

    const result = await this.orchestrationService.generateCoverLetter({
      parsed_resume: resume.parsedData,
      parsed_job: this.jobPayload(application),
      tone,
      fit_analysis: application.skillGapAnalysis,
    });

    return this.prisma.application.update({
      where: { id },
      data: {
        resumeId: resume.id,
        coverLetter: result.cover_letter,
        coverLetterTone: tone,
        // Freshly generated text is never auto-approved — the approval
        // click is the human-in-the-loop step this app is built around.
        coverLetterApproved: false,
      },
      include: WITH_ROUNDS,
    });
  }

  // Prep is generated ONCE per application and then persisted: reopening
  // the page, moving the application between stages (Applied -> Interview
  // -> Applied -> Interview) or adding an interview round all read the
  // stored copy back. The guard below is what makes that true — without
  // it every one of those paths would spend two more LLM calls on an
  // answer we already have. Only an explicit user "Regenerate" pays again.
  async generateInterviewPrep(id: string, userId: string, regenerate = false) {
    const application = await this.findOne(id, userId);
    if (application.interviewPrep && !regenerate) {
      return application;
    }
    const resume = await this.getResumeForApplication(userId, application);

    const result = await this.orchestrationService.generateInterviewPrep({
      parsed_resume: resume.parsedData,
      parsed_job: this.jobPayload(application),
      fit_analysis: application.skillGapAnalysis,
    });

    return this.prisma.application.update({
      where: { id },
      data: {
        resumeId: resume.id,
        interviewPrep: {
          studyTopics: result.study_topics.map((topic) => ({
            topic: topic.topic,
            category: topic.category,
            priority: topic.priority,
            difficulty: topic.difficulty,
            relevance: topic.relevance,
          })),
          questions: result.questions.map((q) => ({
            question: q.question,
            groundedIn: q.grounded_in,
            talkingPoints: q.talking_points,
          })),
          focusAreas: result.focus_areas.map((focus) => ({
            area: focus.area,
            why: focus.why,
            priority: focus.priority,
          })),
          // Stamped at persist time so the UI can show how old the pack is
          // and so "has this been regenerated?" is answerable from the row.
          generatedAt: new Date().toISOString(),
        },
      },
      include: WITH_ROUNDS,
    });
  }

  // Every AI action grades against a CONFIRMED resume (reviewed-and-saved
  // by the user, never a merely-parsed one — parsed data they haven't
  // looked at yet could contain extraction errors they'd have corrected).
  //
  // If this application already has a resumeId (a previous AI action ran
  // against it), we keep using THAT resume, even if the user has since
  // confirmed a newer one — otherwise re-running fit analysis on an old
  // application would silently start grading against a resume the
  // application's own skillGapAnalysis/coverLetter/interviewPrep were
  // never generated from, with nothing on the row to explain the jump.
  // Only a fresh application (no resumeId yet) picks up the latest
  // confirmed resume.
  private async getResumeForApplication(
    userId: string,
    application: { resumeId: string | null },
  ) {
    if (application.resumeId) {
      const resume = await this.prisma.resume.findFirst({
        where: { id: application.resumeId, userId, status: 'CONFIRMED' },
      });
      if (resume && resume.parsedData) {
        return resume;
      }
    }
    return this.getConfirmedResume(userId);
  }

  private async getConfirmedResume(userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { userId, status: 'CONFIRMED' },
      orderBy: { updatedAt: 'desc' },
    });
    if (!resume || !resume.parsedData) {
      throw new BadRequestException(
        'Confirm a resume first — AI analysis compares the job against your saved base resume.',
      );
    }
    return resume;
  }

  private jobPayload(application: {
    company: string;
    jobTitle: string;
    jobDescription: string;
  }) {
    return {
      company: application.company,
      job_title: application.jobTitle,
      description: application.jobDescription,
    };
  }
}
