import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrchestrationModule } from '../orchestration/orchestration.module';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  imports: [AuthModule, OrchestrationModule],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}
