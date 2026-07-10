import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

// @Global() for the same reason PrismaModule is — Storage access is a
// cross-cutting concern any feature module might need (resumes now,
// generated cover-letter PDFs later), not something worth re-importing
// everywhere.
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
