import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, hours, minutes } from '@nestjs/throttler';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { UserThrottlerGuard } from '../throttler/user-throttler.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { ClerkJwtPayload } from '../auth/guards/clerk-auth.guard';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import {
  GenerateCoverLetterDto,
  UpdateApplicationDto,
} from './dto/update-application.dto';

// Guard ORDER matters: ClerkAuthGuard must run first so that
// UserThrottlerGuard.getTracker() can read request.user and count per
// account rather than per IP.
@Controller('applications')
@UseGuards(ClerkAuthGuard, UserThrottlerGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  findAll(@CurrentUser() user: ClerkJwtPayload) {
    return this.applicationsService.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: ClerkJwtPayload) {
    return this.applicationsService.findOne(id, user.sub);
  }

  @Post()
  create(
    @CurrentUser() user: ClerkJwtPayload,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(user.sub, dto);
  }

  // One PATCH for status changes (kanban drag / dropdown), notes, and
  // cover-letter edits+approval — the DTO decides what's allowed.
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: ClerkJwtPayload,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: ClerkJwtPayload) {
    return this.applicationsService.remove(id, user.sub);
  }

  // --- AI actions (NestJS orchestrates, FastAPI computes) -------------
  //
  // Every route below costs real LLM quota, so they're capped far harder
  // than the CRUD routes above. 10/minute stops a stuck retry loop or
  // someone leaning on Regenerate; 60/day bounds what one account can
  // burn in total — that's 12 full runs of the app (fit + cover letter +
  // interview prep is 4 calls), which is plenty to evaluate it and far
  // short of exhausting a free-tier daily quota.
  //
  // Applied per-method rather than to the controller so listing and
  // editing applications stay on the generous baseline.

  @Throttle({
    short: { ttl: minutes(1), limit: 10 },
    daily: { ttl: hours(24), limit: 60 },
  })
  @Post(':id/analyze-fit')
  analyzeFit(
    @Param('id') id: string,
    @CurrentUser() user: ClerkJwtPayload,
  ) {
    return this.applicationsService.analyzeFit(id, user.sub);
  }

  @Throttle({
    short: { ttl: minutes(1), limit: 10 },
    daily: { ttl: hours(24), limit: 60 },
  })
  @Post(':id/cover-letter')
  generateCoverLetter(
    @Param('id') id: string,
    @CurrentUser() user: ClerkJwtPayload,
    @Body() dto: GenerateCoverLetterDto,
  ) {
    return this.applicationsService.generateCoverLetter(id, user.sub, dto.tone);
  }

  // Costs two LLM calls, not one — it's a two-node graph.
  @Throttle({
    short: { ttl: minutes(1), limit: 10 },
    daily: { ttl: hours(24), limit: 60 },
  })
  @Post(':id/interview-prep')
  generateInterviewPrep(
    @Param('id') id: string,
    @CurrentUser() user: ClerkJwtPayload,
  ) {
    return this.applicationsService.generateInterviewPrep(id, user.sub);
  }
}
