import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestrationService } from '../orchestration/orchestration.service';

@Injectable()
export class ResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrationService: OrchestrationService,
  ) {}

  findAllForUser(userId: string) {
    return this.prisma.resume.findMany({ where: { userId } });
  }

  upload(userId: string) {
    // TODO: accept the uploaded file, store it in Supabase Storage, then
    // call this.orchestrationService.parseResume(...) and persist the result.
    return { userId };
  }
}
