import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import type { ActionCtx, MutationCtx } from "@convex-dev/rate-limiter";
import { ConvexError } from "convex/values";
import { components } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export const RATE_LIMITED_MESSAGE =
  "You're doing that a bit too often. Please wait a moment and try again.";

const limits = {
  // Each submit makes a paid Google Places call and reverts to draft on failure
  submitEntry: { kind: "token bucket", rate: 10, period: HOUR },
  beginPhotoUpload: { kind: "token bucket", rate: 30, period: HOUR },
  enterCompetition: { kind: "token bucket", rate: 5, period: HOUR },
  // Shared by vote and cancel so flipping a vote back and forth is limited too
  changeVote: { kind: "token bucket", rate: 30, period: 10 * MINUTE },
} as const;

export const rateLimiter = new RateLimiter(components.rateLimiter, limits);

export type RateLimitName = keyof typeof limits;

export async function enforceUserRateLimit(
  ctx: MutationCtx | ActionCtx,
  name: RateLimitName,
  userId: Id<"users">,
) {
  const { ok } = await rateLimiter.limit(ctx, name, { key: userId });
  if (!ok) throw new ConvexError(RATE_LIMITED_MESSAGE);
}
