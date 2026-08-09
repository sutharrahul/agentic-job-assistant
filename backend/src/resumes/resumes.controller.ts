import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle, hours, minutes } from '@nestjs/throttler';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { UserThrottlerGuard } from '../throttler/user-throttler.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { ClerkJwtPayload } from '../auth/guards/clerk-auth.guard';
import { ResumesService } from './resumes.service';
import { ConfirmResumeDto } from './dto/confirm-resume.dto';

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Same two types ResumesService used to check by hand — enforced here
// instead, so a wrong file type is rejected by the pipe (clean 400,
// standard message) BEFORE anything is written to Supabase Storage.
const ALLOWED_MIME_PATTERN =
  /^application\/(pdf|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

// Guard order matters — see the note in applications.controller.ts.
@Controller('resumes')
@UseGuards(ClerkAuthGuard, UserThrottlerGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  findAll(@CurrentUser() user: ClerkJwtPayload) {
    return this.resumesService.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: ClerkJwtPayload) {
    return this.resumesService.findOne(id, user.sub);
  }

  // Upload costs an LLM call to parse, plus a write to object storage,
  // so it's capped harder than the read routes. Lower per-minute than
  // the AI actions because re-uploading a resume five times a minute is
  // never a real workflow, and each attempt also stores a file.
  @Throttle({
    short: { ttl: minutes(1), limit: 5 },
    daily: { ttl: hours(24), limit: 40 },
  })
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_RESUME_SIZE_BYTES }),
          new FileTypeValidator({ fileType: ALLOWED_MIME_PATTERN }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: ClerkJwtPayload,
  ) {
    return this.resumesService.upload(user.sub, file, user.email);
  }

  @Patch(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmResumeDto,
    @CurrentUser() user: ClerkJwtPayload,
  ) {
    return this.resumesService.confirm(id, user.sub, dto);
  }
}
