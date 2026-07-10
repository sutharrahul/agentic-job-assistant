import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

// This service is the ONLY place in the backend that talks to the FastAPI
// AI service — every other module (Resumes, Applications) goes through
// here instead of calling FastAPI directly. That's the whole point of the
// "orchestration" layer in the architecture: one choke point, so caching,
// retries, or error-handling for AI calls only need to be written once.
@Injectable()
export class OrchestrationService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get baseUrl(): string {
    return this.configService.getOrThrow<string>('AI_SERVICE_URL');
  }

  // @nestjs/axios wraps plain axios in an RxJS Observable (a NestJS
  // convention borrowed from Angular). The rest of this codebase is
  // async/await, not RxJS streams, so firstValueFrom() takes the one
  // value an HTTP response Observable ever emits and turns it into a
  // Promise — that's the only reason RxJS shows up here at all.
  private async post<T>(path: string, payload: unknown): Promise<T> {
    const { data } = await firstValueFrom(
      this.httpService.post<T>(`${this.baseUrl}${path}`, payload),
    );
    return data;
  }

  parseResume(payload: unknown) {
    return this.post('/parse-resume', payload);
  }

  parseJobDescription(payload: unknown) {
    return this.post('/parse-jd', payload);
  }

  analyzeFit(payload: unknown) {
    // TODO: check Redis for a cached result (keyed on resume + job
    // description) before making this call, and write the response back
    // to the cache after. This is the one AI call worth caching, because
    // scoring the same resume against the same job description twice
    // should return the same score — see WALKTHROUGH.md.
    return this.post('/analyze-fit', payload);
  }

  generateCoverLetter(payload: unknown) {
    return this.post('/generate-cover-letter', payload);
  }
}
