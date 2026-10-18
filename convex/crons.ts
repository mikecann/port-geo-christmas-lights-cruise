import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup of stuck uploads every 24 hours
crons.interval(
  "cleanup stuck uploads",
  { hours: 24 },
  internal.internal.cleanup.cleanupStuckUploads,
  {},
);

crons.interval(
  "cleanup expired sign-in codes",
  { hours: 1 },
  internal.internal.cleanup.cleanupExpiredSignInCodes,
  {},
);

crons.interval(
  "cleanup used location tokens",
  { hours: 1 },
  internal.internal.cleanup.cleanupUsedGeoTokens,
  {},
);

export default crons;
