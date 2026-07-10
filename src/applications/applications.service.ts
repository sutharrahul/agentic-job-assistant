import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestrationService } from '../orchestration/orchestration.service';
import { ApplicationStatus } from '../../generated/prisma';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrationService: OrchestrationService,
  ) {}

  findAllForUser(userId: string) {
    return this.prisma.application.findMany({ where: { userId } });
  }

  create(userId: string) {
    // TODO: accept jobDescription + resumeId, call
    // this.orchestrationService.analyzeFit(...) / generateCoverLetter(...),
    // then persist via this.prisma.application.create(...).
    return { userId };
  }

  updateStatus(id: string, status: string) {
    // `status as ApplicationStatus` just tells TypeScript "trust me,
    // this string is one of APPLIED/INTERVIEW/OFFER/REJECTED" — it does
    // NOT check that at runtime. Right now nothing stops a caller from
    // sending status: "banana" and having it reach the database (Prisma
    // itself will reject it there, but with a raw DB error, not a clean
    // 400). This is a known gap — see WALKTHROUGH.md weak spots.
    return this.prisma.application.update({
      where: { id },
      data: { status: status as ApplicationStatus },
    });
  }
}
