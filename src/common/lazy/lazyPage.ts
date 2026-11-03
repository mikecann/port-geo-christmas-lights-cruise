import { lazy } from "react";
import { recoverFromFailedPageLoad } from "./staleBuild";

// React's lazy(), but a page whose file is gone after a deploy reloads the
// site onto the new build instead of crashing it
export const lazyPage: typeof lazy = (load) =>
  lazy(() => load().catch(recoverFromFailedPageLoad));
