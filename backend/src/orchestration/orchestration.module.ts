import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OrchestrationService } from './orchestration.service';

// 2 minutes, not axios's default of "wait forever". These calls run LLM
// inference — a two-node LangGraph on a local model legitimately takes
// ~a minute — so the timeout has to be generous, but unbounded means a
// hung Ollama process holds a Node request handle open indefinitely.
// OrchestrationService turns the resulting ECONNABORTED into a 504.
const AI_REQUEST_TIMEOUT_MS = 120_000;

@Module({
  imports: [HttpModule.register({ timeout: AI_REQUEST_TIMEOUT_MS })],
  providers: [OrchestrationService],
  exports: [OrchestrationService],
})
export class OrchestrationModule {}
