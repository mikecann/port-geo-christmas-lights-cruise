import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";
import resend from "@convex-dev/resend/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";

const app = defineApp();
app.use(aggregate, { name: "aggregateVotes" });
app.use(resend);
app.use(rateLimiter);

export default app;
