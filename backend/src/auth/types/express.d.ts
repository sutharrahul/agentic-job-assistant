// FLAG: this is a TypeScript pattern called "declaration merging" — you
// probably haven't seen it in a course yet. Express's built-in Request
// type doesn't have a `user` field, but clerk-auth.guard.ts does
// `request.user = payload`. This block reopens Express's own type
// definition and adds `user` to it, so that assignment (and reading
// request.user in current-user.decorator.ts) type-checks everywhere in
// the project.
//
// It has ZERO effect at runtime — deleting this file wouldn't break the
// app, it would just make TypeScript complain "Property 'user' does not
// exist on type 'Request'" wherever request.user is used. It exists
// purely so the compiler understands a property we're adding dynamically
// at runtime.
import { ClerkJwtPayload } from '../guards/clerk-auth.guard';

declare global {
  namespace Express {
    interface Request {
      user?: ClerkJwtPayload;
    }
  }
}
