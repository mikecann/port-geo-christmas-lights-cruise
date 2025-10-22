import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";
import resend from "@convex-dev/resend/convex.config";

const app = defineApp();
app.use(aggregate, { name: "aggregateVotes" });
app.use(resend);

export default app;
