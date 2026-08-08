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
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { ClerkJwtPayload } from '../auth/guards/clerk-auth.guard';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import {
  GenerateCoverLetterDto,
  UpdateApplicationDto,
} from './dto/update-application.dto';

@Controller('applications')
@UseGuards(ClerkAuthGuard)
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

  @Post(':id/analyze-fit')
  analyzeFit(
    @Param('id') id: string,
    @CurrentUser() user: ClerkJwtPayload,
  ) {
    return this.applicationsService.analyzeFit(id, user.sub);
  }

  @Post(':id/cover-letter')
  generateCoverLetter(
    @Param('id') id: string,
    @CurrentUser() user: ClerkJwtPayload,
    @Body() dto: GenerateCoverLetterDto,
  ) {
    return this.applicationsService.generateCoverLetter(id, user.sub, dto.tone);
  }

  @Post(':id/interview-prep')
  generateInterviewPrep(
    @Param('id') id: string,
    @CurrentUser() user: ClerkJwtPayload,
  ) {
    return this.applicationsService.generateInterviewPrep(id, user.sub);
  }
}
