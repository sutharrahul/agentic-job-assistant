import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() means any other module in the app can inject PrismaService
// without importing PrismaModule first — normally, module B has to add
// `imports: [PrismaModule]` before it's allowed to inject PrismaService
// (see users.module.ts for that normal pattern with AuthModule). We make
// an exception for Prisma because nearly every feature module needs
// database access, and importing it everywhere would just be repetitive.
// This is a deliberate trade-off: less boilerplate, at the cost of it
// being slightly less obvious *where* PrismaService comes from when
// you're reading a module file in isolation.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
