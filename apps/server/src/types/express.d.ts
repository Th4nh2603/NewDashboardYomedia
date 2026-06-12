import type { VerifiedAuth } from "../modules/auth/lib/clerkAuth.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireClerkAuth` after Clerk JWT verification + local account lookup. */
      verifiedAuth?: VerifiedAuth;
    }
  }
}

export {};
