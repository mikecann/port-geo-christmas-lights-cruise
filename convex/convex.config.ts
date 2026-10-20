import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";
import resend from "@convex-dev/resend/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import stateMachines from "@convex-dev/state-machines/convex.config.js";

const app = defineApp();
app.use(aggregate, { name: "aggregateVotes" });
app.use(resend);
app.use(rateLimiter);
app.use(stateMachines);

export default app;
