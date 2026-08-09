import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrchestrationModule } from '../orchestration/orchestration.module';
import { UsersModule } from '../users/users.module';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

// UsersModule is here for one reason: upload() has to be able to
// guarantee the User row exists before writing a Resume that references
// it. See the call site in resumes.service.ts.
@Module({
  imports: [AuthModule, OrchestrationModule, UsersModule],
  controllers: [ResumesController],
  providers: [ResumesService],
})
export class ResumesModule {}
