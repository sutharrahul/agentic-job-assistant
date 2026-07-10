import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/guards/supabase-auth.guard';
import { ResumesService } from './resumes.service';

@Controller('resumes')
@UseGuards(SupabaseAuthGuard)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Get()
  findAll(@CurrentUser() user: SupabaseJwtPayload) {
    return this.resumesService.findAllForUser(user.sub);
  }

  @Post()
  upload(@CurrentUser() user: SupabaseJwtPayload) {
    return this.resumesService.upload(user.sub);
  }
}
