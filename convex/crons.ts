import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "clean stale presence",
  { minutes: 1 },
  internal.presence.cleanupStale,
  {}
);

crons.interval(
  "aether breathing pulse",
  { minutes: 1 },
  internal.pulse.runIfNeeded,
  { trigger: "scheduled" }
);

export default crons;
