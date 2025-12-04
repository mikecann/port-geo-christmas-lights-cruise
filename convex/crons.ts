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

export default crons;
