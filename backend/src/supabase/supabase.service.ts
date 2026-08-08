import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_RESUME_BUCKET = 'resumes';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;
  private readonly resumeBucket: string;

  constructor(private readonly configService: ConfigService) {
    // Supabase is used here for STORAGE ONLY — authentication is Clerk's
    // job, and the frontend never talks to Supabase at all.
    //
    // This client uses the SERVICE ROLE key, which bypasses Row Level
    // Security entirely. That's appropriate because NestJS is a trusted
    // server that already does its own authorization (ClerkAuthGuard
    // plus `userId` scoping in ResumesService), so it doesn't need
    // Postgres-level RLS as a second gate the way a browser-side client
    // would. It also means this key must never reach the frontend.
    this.client = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
    this.resumeBucket =
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET') ??
      DEFAULT_RESUME_BUCKET;
  }

  async onModuleInit() {
    const { data: buckets } = await this.client.storage.listBuckets();
    const exists = buckets?.some((bucket) => bucket.name === this.resumeBucket);
    if (!exists) {
      const { error } = await this.client.storage.createBucket(
        this.resumeBucket,
        { public: false },
      );
      if (error) {
        this.logger.error(
          `Failed to create "${this.resumeBucket}" bucket`,
          error,
        );
      }
    }
  }

  async uploadResume(
    path: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    const { error } = await this.client.storage
      .from(this.resumeBucket)
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
      .from(this.resumeBucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data) {
      throw new Error(
        `Supabase Storage signed URL failed: ${error?.message}`,
      );
    }
    return data.signedUrl;
  }
}
