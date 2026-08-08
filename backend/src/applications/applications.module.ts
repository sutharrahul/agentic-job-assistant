import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrchestrationModule } from '../orchestration/orchestration.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [AuthModule, OrchestrationModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
