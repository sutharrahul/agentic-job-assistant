import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  AnalyzeFitResponse,
  GenerateCoverLetterResponse,
  InterviewPrepResponse,
  JobPayload,
  ParseResumeResponse,
} from './orchestration.types';

// This service is the ONLY place in the backend that talks to the FastAPI
// AI service — every other module (Resumes, Applications) goes through
// here instead of calling FastAPI directly. That's the whole point of the
// "orchestration" layer in the architecture: one choke point, so caching,
// retries, or error-handling for AI calls only need to be written once.
@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.configService.getOrThrow<string>('AI_SERVICE_URL');
  }

  // Shared secret proving to the AI service that this request came from
  // us. It exists because the free hosting tier gives that service a
  // public URL instead of a private one — the reasoning lives in
  // ai-service/app/core/security.py.
  //
  // get(), not getOrThrow(): the AI service treats a missing token as
  // "unprotected" for local development, so the backend has to be able to
  // run without one too. Both sides get it from render.yaml in deployment.
  private get serviceHeaders(): Record<string, string> {
    const token = this.configService.get<string>('AI_SERVICE_TOKEN');
    return token ? { 'X-Service-Token': token } : {};
  }

  // @nestjs/axios wraps plain axios in an RxJS Observable (a NestJS
  // convention borrowed from Angular). The rest of this codebase is
  // async/await, not RxJS streams, so firstValueFrom() takes the one
  // value an HTTP response Observable ever emits and turns it into a
  // Promise — that's the only reason RxJS shows up here at all.
  //
  // Everything is funneled through here (see the class comment) so this
  // one try/catch is the only error translation the AI calls need. The
  // request timeout itself is configured once in orchestration.module.ts.
  private async post<T>(path: string, payload: unknown): Promise<T> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<T>(`${this.baseUrl}${path}`, payload, {
          headers: this.serviceHeaders,
        }),
      );
      return data;
    } catch (error) {
      throw this.toHttpException(path, error);
    }
  }

  // Without this, every AI failure reached the user as a bare 500
  // "Internal server error" — including FastAPI's genuinely useful 4xx
  // messages ("No extractable text found in resume — is it a scanned
  // image?"), which were being thrown away at this boundary.
  private toHttpException(path: string, error: unknown): Error {
    if (!(error instanceof AxiosError)) {
      return error instanceof Error ? error : new Error(String(error));
    }

    // The AI service answered, and it was a client error — that response
    // describes something the USER can act on, so pass it through with
    // its own status and message rather than flattening it to a 500.
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) {
      const detail = (error.response?.data as { detail?: unknown } | undefined)
        ?.detail;
      const message =
        typeof detail === 'string' ? detail : 'AI service rejected the request';
      this.logger.warn(`${path} -> ${status}: ${message}`);
      return new HttpException(message, status);
    }

    // Everything else is OUR problem, not the user's: the AI service is
    // down, unreachable, or took longer than the configured timeout.
    // Log the real cause (the user only gets the generic message).
    this.logger.error(`${path} failed: ${error.code ?? ''} ${error.message}`);

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new GatewayTimeoutException(
        'The AI service took too long to respond. Please try again.',
      );
    }
    return new BadGatewayException(
      'The AI service is unavailable right now. Please try again shortly.',
    );
  }

  parseResume(payload: { resume_url: string }) {
    return this.post<ParseResumeResponse>('/parse-resume', payload);
  }

  analyzeFit(payload: { parsed_resume: unknown; parsed_job: JobPayload }) {
    return this.post<AnalyzeFitResponse>('/analyze-fit', payload);
  }

  generateCoverLetter(payload: {
    parsed_resume: unknown;
    parsed_job: JobPayload;
    tone: string;
    fit_analysis?: unknown;
  }) {
    return this.post<GenerateCoverLetterResponse>(
      '/generate-cover-letter',
      payload,
    );
  }

  generateInterviewPrep(payload: {
    parsed_resume: unknown;
    parsed_job: JobPayload;
    fit_analysis?: unknown;
  }) {
    return this.post<InterviewPrepResponse>('/interview-prep', payload);
  }
}
