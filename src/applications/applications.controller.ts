import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SupabaseJwtPayload } from '../auth/guards/supabase-auth.guard';
import { ApplicationsService } from './applications.service';

@Controller('applications')
@UseGuards(SupabaseAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  findAll(@CurrentUser() user: SupabaseJwtPayload) {
    return this.applicationsService.findAllForUser(user.sub);
  }

  @Post()
  create(@CurrentUser() user: SupabaseJwtPayload) {
    return this.applicationsService.create(user.sub);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.applicationsService.updateStatus(id, body.status);
  }
}
