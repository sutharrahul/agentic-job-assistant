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
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/guards/supabase-auth.guard';
import { ResumesService } from './resumes.service';
import { ConfirmResumeDto } from './dto/confirm-resume.dto';

const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Same two types ResumesService used to check by hand — enforced here
// instead, so a wrong file type is rejected by the pipe (clean 400,
// standard message) BEFORE anything is written to Supabase Storage.
const ALLOWED_MIME_PATTERN =
  /^application\/(pdf|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;

@Controller('resumes')
@UseGuards(SupabaseAuthGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  findAll(@CurrentUser() user: SupabaseJwtPayload) {
    return this.resumesService.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: SupabaseJwtPayload) {
    return this.resumesService.findOne(id, user.sub);
  }

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
    @CurrentUser() user: SupabaseJwtPayload,
  ) {
    return this.resumesService.upload(user.sub, file);
  }

  @Patch(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmResumeDto,
    @CurrentUser() user: SupabaseJwtPayload,
  ) {
    return this.resumesService.confirm(id, user.sub, dto);
  }
}
