import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { OrchestrationService } from '../orchestration/orchestration.service';
import { UsersService } from '../users/users.service';
import { ConfirmResumeDto } from './dto/confirm-resume.dto';

@Injectable()
export class ResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly orchestrationService: OrchestrationService,
    private readonly usersService: UsersService,
  ) {}

  findAllForUser(userId: string) {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
    });
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    return resume;
  }

  async upload(userId: string, file: Express.Multer.File, email?: string) {
    // File type/size are validated by the controller's ParseFilePipe
    // before this runs — by magic number, not the client-supplied
    // mimetype — so a bad file never reaches Storage at all.

    // The LAST line of defence for the webhook race. UserSync (frontend)
    // and the Clerk webhook both normally provision this row well before
    // anyone reaches this method, but "normally" isn't good enough here:
    // this is the first write that carries a foreign key to User, and if
    // the row is missing the upload fails AFTER the file is already in
    // Storage — an orphaned object and an opaque 500, for a user whose
    // very first action it was.
    //
    // upsertFromAuth is idempotent, so the normal case is one indexed
    // write. Passing the JWT's email avoids a Clerk API round-trip —
    // but only when the dashboard's session-token claim is configured
    // (see clerk-auth.guard.ts, where that manual step is documented).
    // If it isn't, resolveEmail falls back to a network call to Clerk on
    // every upload, before the storage write. That's the cost of a
    // missing dashboard setting, not of this line.
    await this.usersService.upsertFromAuth(userId, email);

    // userId-prefixed path doubles as a per-user folder in the bucket —
    // makes it trivial to reason about "which files belong to this
    // user" directly in the Supabase dashboard, and randomUUID() avoids
    // collisions if the same filename is uploaded twice.
    const storagePath = `${userId}/${randomUUID()}-${file.originalname}`;
    await this.supabaseService.uploadResume(
      storagePath,
      file.buffer,
      file.mimetype,
    );

    // Row exists as soon as the file is stored — even if parsing fails
    // below, there's a record (status: FAILED) instead of the upload
    // silently vanishing.
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        fileName: file.originalname,
        storagePath,
        status: 'PROCESSING',
      },
    });

    try {
      const resumeUrl = await this.supabaseService.createSignedUrl(
        storagePath,
      );
      const { parsed } = await this.orchestrationService.parseResume({
        resume_url: resumeUrl,
      });

      return this.prisma.resume.update({
        where: { id: resume.id },
        // Prisma's Json input type wants a plain object with a string
        // index signature; our hand-written ParsedResumeData interface
        // (orchestration.types.ts) is structurally identical but
        // doesn't declare one, so TS won't accept it without this cast
        // — same reasoning as the `dto as object` cast in confirm()
        // below.
        data: { status: 'PARSED', parsedData: parsed as object },
      });
    } catch (error) {
      await this.prisma.resume.update({
        where: { id: resume.id },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  async confirm(id: string, userId: string, dto: ConfirmResumeDto) {
    // findOne already scopes by userId, so this throws NotFoundException
    // (not a silent no-op) if the resume doesn't belong to this user —
    // that check has to happen before the update, since Prisma's
    // update() has no built-in "and this must belong to this user"
    // clause.
    await this.findOne(id, userId);

    return this.prisma.resume.update({
      where: { id },
      data: { status: 'CONFIRMED', parsedData: dto as object },
    });
  }
}
