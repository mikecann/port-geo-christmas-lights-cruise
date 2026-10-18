import { ConvexError } from "convex/values";

// Production never sets this, so wipes only ever run on dev deployments
export function areDestructiveWipesAllowed() {
  return process.env.ALLOW_DESTRUCTIVE_WIPES === "true";
}

export function ensureDestructiveWipesAllowed() {
  if (!areDestructiveWipesAllowed())
    throw new ConvexError(
      "Wipes are turned off on this deployment. Set ALLOW_DESTRUCTIVE_WIPES=true on a dev deployment to use them.",
    );
}
