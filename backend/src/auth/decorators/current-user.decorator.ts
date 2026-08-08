// createParamDecorator is how NestJS lets you build a CUSTOM version of
// things like @Body() or @Param() — it's a factory that produces a
// decorator. This one, @CurrentUser(), lets a controller method just ask
// for the logged-in user as a parameter:
//
//   @Get('me')
//   getMe(@CurrentUser() user: ClerkJwtPayload) { ... }
//
// instead of every handler having to do
// `const user = request.user` by hand. It only works on routes protected
// by ClerkAuthGuard, since that's what puts `user` on the request in
// the first place — see clerk-auth.guard.ts.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ClerkJwtPayload } from '../guards/clerk-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClerkJwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
