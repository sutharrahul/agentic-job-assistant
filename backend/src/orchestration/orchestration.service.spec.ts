import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { OrchestrationService } from './orchestration.service';

const AI_SERVICE_URL = 'http://ai-service.test';
const PAYLOAD = { resume_url: 'https://storage.test/cv.pdf' };

// Built as a real AxiosError rather than a look-alike object because
// toHttpException branches on `instanceof AxiosError` first — a plain
// `{ response: { status } }` would take the pass-through branch and the
// test would prove nothing.
function axiosFailure(
  code: string,
  response?: { status: number; data?: unknown },
): AxiosError {
  return new AxiosError(
    'Request failed',
    code,
    undefined,
    undefined,
    response &&
      ({
        status: response.status,
        data: response.data,
        statusText: '',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      } as unknown as AxiosResponse),
  );
}

// The service only ever rethrows, so the thrown value IS the assertion
// target — catching it here keeps every test from repeating try/catch.
async function rejection(promise: Promise<unknown>): Promise<any> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the AI call to reject, but it resolved');
}

describe('OrchestrationService', () => {
  let httpService: { post: jest.Mock };

  // Token varies per test (that's the branch under test), so the module
  // is rebuilt per test rather than shared in a beforeEach.
  async function createService(token?: string) {
    httpService = { post: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrchestrationService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(AI_SERVICE_URL),
            get: jest.fn((key: string) =>
              key === 'AI_SERVICE_TOKEN' ? token : undefined,
            ),
          },
        },
      ],
    }).compile();

    return moduleRef.get(OrchestrationService);
  }

  beforeAll(() => {
    // Every failure below is deliberate and the service logs each one;
    // silence the logger so a green run has a readable output.
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('error translation', () => {
    it("preserves FastAPI's status and detail message on a 4xx", async () => {
      // The regression this guards: these messages were being flattened
      // to a bare 500 "Internal server error", so the one thing the user
      // could actually act on never reached them.
      const detail =
        'No extractable text found in resume — is it a scanned image?';
      const service = await createService();
      httpService.post.mockReturnValue(
        throwError(() => axiosFailure('ERR_BAD_REQUEST', { status: 422, data: { detail } })),
      );

      const error = await rejection(service.parseResume(PAYLOAD));

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(422);
      expect(error.message).toBe(detail);
    });

    it.each([
      ['a non-string detail (FastAPI validation array)', { detail: [{ msg: 'bad' }] }],
      ['a missing detail', { message: 'something else' }],
      ['a non-object body', 'plain text body'],
    ])('falls back to a generic message for %s', async (_case, data) => {
      const service = await createService();
      httpService.post.mockReturnValue(
        throwError(() => axiosFailure('ERR_BAD_REQUEST', { status: 400, data })),
      );

      const error = await rejection(service.parseResume(PAYLOAD));

      expect(error).toBeInstanceOf(HttpException);
      // Status still comes from the AI service — only the message is
      // replaced, because a JSON blob is not a sentence a user can read.
      expect(error.getStatus()).toBe(400);
      expect(error.message).toBe('AI service rejected the request');
    });

    it.each(['ECONNABORTED', 'ETIMEDOUT'])(
      'turns a %s timeout into a 504',
      async (code) => {
        const service = await createService();
        httpService.post.mockReturnValue(throwError(() => axiosFailure(code)));

        const error = await rejection(service.analyzeFit({ parsed_resume: {}, parsed_job: {} as any }));

        expect(error).toBeInstanceOf(GatewayTimeoutException);
        expect(error.getStatus()).toBe(504);
      },
    );

    it('turns a connection refusal into a 502', async () => {
      const service = await createService();
      httpService.post.mockReturnValue(
        throwError(() => axiosFailure('ECONNREFUSED')),
      );

      const error = await rejection(service.parseResume(PAYLOAD));

      expect(error).toBeInstanceOf(BadGatewayException);
      expect(error.getStatus()).toBe(502);
    });

    it('turns a 5xx into a 502 and does not leak the upstream detail', async () => {
      // A 5xx detail describes OUR broken dependency (stack traces, model
      // names, quota errors), not something the user did — unlike the 4xx
      // case above it must not be forwarded.
      const service = await createService();
      httpService.post.mockReturnValue(
        throwError(() =>
          axiosFailure('ERR_BAD_RESPONSE', {
            status: 503,
            data: { detail: 'OPENAI_API_KEY quota exceeded' },
          }),
        ),
      );

      const error = await rejection(service.parseResume(PAYLOAD));

      expect(error).toBeInstanceOf(BadGatewayException);
      expect(error.message).not.toContain('OPENAI_API_KEY');
    });

    it('passes a non-Axios error through untouched', async () => {
      // A bug in our own mapping code must not be disguised as "the AI
      // service is unavailable" — that would send us debugging the wrong
      // service entirely.
      const bug = new TypeError('Cannot read properties of undefined');
      const service = await createService();
      httpService.post.mockReturnValue(throwError(() => bug));

      const error = await rejection(service.parseResume(PAYLOAD));

      expect(error).toBe(bug);
    });

    it('wraps a thrown non-Error value so the caller always gets an Error', async () => {
      const service = await createService();
      httpService.post.mockReturnValue(throwError(() => 'kaboom'));

      const error = await rejection(service.parseResume(PAYLOAD));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('kaboom');
    });
  });

  describe('service token', () => {
    it('sends X-Service-Token when one is configured', async () => {
      const service = await createService('shared-secret');
      httpService.post.mockReturnValue(of({ data: { parsed: { skills: [] } } }));

      const result = await service.parseResume(PAYLOAD);

      expect(result).toEqual({ parsed: { skills: [] } });
      expect(httpService.post).toHaveBeenCalledWith(
        `${AI_SERVICE_URL}/parse-resume`,
        PAYLOAD,
        { headers: { 'X-Service-Token': 'shared-secret' } },
      );
    });

    it('omits the header entirely when no token is configured', async () => {
      // Not "sends an empty token": the AI service reads a *present*
      // header, so an empty string would be a failed auth attempt rather
      // than the unauthenticated local-dev mode this branch exists for.
      const service = await createService(undefined);
      httpService.post.mockReturnValue(of({ data: { parsed: { skills: [] } } }));

      await service.parseResume(PAYLOAD);

      expect(httpService.post.mock.calls[0][2]).toStrictEqual({ headers: {} });
    });
  });
});
