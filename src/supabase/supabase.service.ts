import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Bucket name is intentionally a constant, not an env var — there's only
// ever one resumes bucket, so making it "configurable" would just be a
// setting nobody changes. Assumption flagged for review: this bucket
// must exist in your Supabase project; onModuleInit below creates it if
// it doesn't.
const RESUME_BUCKET = 'resumes';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    // This client uses the SERVICE ROLE key, not the anon key the
    // frontend uses — service role bypasses Row Level Security
    // entirely. That's appropriate here because NestJS is a trusted
    // server, already responsible for its own authorization (the
    // SupabaseAuthGuard + `userId` scoping in ResumesService), so it
    // doesn't need Postgres-level RLS as a second gate the way
    // browser-side Supabase calls would.
    this.client = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async onModuleInit() {
    const { data: buckets } = await this.client.storage.listBuckets();
    const exists = buckets?.some((bucket) => bucket.name === RESUME_BUCKET);
    if (!exists) {
      const { error } = await this.client.storage.createBucket(
        RESUME_BUCKET,
        { public: false },
      );
      if (error) {
        this.logger.error(`Failed to create "${RESUME_BUCKET}" bucket`, error);
      }
    }
  }

  async uploadResume(
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    const { error } = await this.client.storage
      .from(RESUME_BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }
  }

  async createSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
    // Short-lived (5 min default) and scoped to exactly this file — this
    // is the URL FastAPI is handed to fetch the resume from, so it only
    // needs to stay valid for the length of one parse request, not
    // forever.
    const { data, error } = await this.client.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data) {
      throw new Error(
        `Supabase Storage signed URL failed: ${error?.message}`,
      );
    }
    return data.signedUrl;
  }
}
