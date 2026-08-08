import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestrationService } from '../orchestration/orchestration.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import {
  CoverLetterTone,
  UpdateApplicationDto,
} from './dto/update-application.dto';

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
    });
  }

  // Scoped by userId so one user can never read/modify another user's
  // application by guessing ids — same pattern as ResumesService.findOne.
  async findOne(id: string, userId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, userId },
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
    });
  }

  async update(id: string, userId: string, dto: UpdateApplicationDto) {
    await this.findOne(id, userId);
    // Date fields arrive as strings in the JSON body but Prisma wants
    // Date objects — and "" means "the user cleared the input" (-> null).
    const { interviewAt, joiningDate, ...rest } = dto;
    return this.prisma.application.update({
      where: { id },
      data: {
        ...rest,
        interviewAt: this.toDateOrClear(interviewAt),
        joiningDate: this.toDateOrClear(joiningDate),
      },
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

  // --- AI actions -----------------------------------------------------
  // Each one: load the application + the user's confirmed resume, hand
  // both to the AI service via OrchestrationService, persist the result
  // on the application row, return the updated row. The FastAPI side is
  // stateless — every fact it needs travels in the request.

  async analyzeFit(id: string, userId: string) {
    const application = await this.findOne(id, userId);
    const resume = await this.getConfirmedResume(userId);

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
    });
  }

  async generateCoverLetter(id: string, userId: string, tone: CoverLetterTone) {
    const application = await this.findOne(id, userId);
    const resume = await this.getConfirmedResume(userId);

    const result = await this.orchestrationService.generateCoverLetter({
      parsed_resume: resume.parsedData,
      parsed_job: this.jobPayload(application),
      tone,
      fit_analysis: application.skillGapAnalysis,
    });

    return this.prisma.application.update({
      where: { id },
      data: {
        coverLetter: result.cover_letter,
        coverLetterTone: tone,
        // Freshly generated text is never auto-approved — the approval
        // click is the human-in-the-loop step this app is built around.
        coverLetterApproved: false,
      },
    });
  }

  async generateInterviewPrep(id: string, userId: string) {
    const application = await this.findOne(id, userId);
    const resume = await this.getConfirmedResume(userId);

    const result = await this.orchestrationService.generateInterviewPrep({
      parsed_resume: resume.parsedData,
      parsed_job: this.jobPayload(application),
      fit_analysis: application.skillGapAnalysis,
    });

    return this.prisma.application.update({
      where: { id },
      data: {
        interviewPrep: {
          focusAreas: result.focus_areas,
          technicalQuestions: result.technical_questions.map((q) => ({
            question: q.question,
            talkingPoints: q.talking_points,
          })),
          behavioralQuestions: result.behavioral_questions.map((q) => ({
            question: q.question,
            talkingPoints: q.talking_points,
          })),
          gapsToPrepare: result.gaps_to_prepare,
        },
      },
    });
  }

  // Every AI action grades against the user's CONFIRMED resume (their
  // reviewed-and-saved base profile), never a merely-parsed one — parsed
  // data the user hasn't looked at yet could contain extraction errors
  // they'd have corrected.
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
