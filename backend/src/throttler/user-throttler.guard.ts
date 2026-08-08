import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

// Rate limits are counted per authenticated USER, not per IP.
//
// IP is the library's default and it breaks in exactly the environment
// this deploys to: behind a reverse proxy (Render, Vercel), every
// request arrives carrying the proxy's address, so a single shared
// bucket would throttle all users together — one busy visitor would
// lock everyone else out.
//
// Every route this guard protects runs ClerkAuthGuard first (see the
// @UseGuards order in the controllers), so `request.user` is already
// populated by the time getTracker runs. The IP fallback only matters
// if this is ever attached to an unauthenticated route.
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const userId = (req as { user?: { sub?: string } }).user?.sub;
    const ip = (req as { ip?: string }).ip;
    return Promise.resolve(userId ? `user:${userId}` : `ip:${ip ?? 'unknown'}`);
  }

  // The default message is the literal string "ThrottlerException: Too
  // Many Requests", which the UI would show to the user as-is. Say what
  // happened and what to do instead.
  protected getErrorMessage(
    _context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<string> {
    const seconds = Math.ceil(detail.timeToBlockExpire);
    const wait =
      seconds > 90
        ? `${Math.ceil(seconds / 60)} minutes`
        : `${Math.max(seconds, 1)} seconds`;

    return Promise.resolve(
      `Too many requests. These actions are rate limited to protect the ` +
        `AI quota — please try again in ${wait}.`,
    );
  }
}
