import { getAuthUserId } from "@convex-dev/auth/server";
import { viewerArgs } from "@convex-dev/state-machines";
import type { Auth } from "convex/server";
import type { DatabaseReader } from "../../_generated/server";
import { query } from "../../_generated/server";
import { users } from "../../features/users/model";
import { machines } from "../../machines";

// What the state machines viewer on the Machines page reads: the app's
// machines as it runs them, and each entry through `survey`. Read-only:
// there's no `send` or `create`, so nothing here can move an entry.
//
// Plain queries rather than systemAdminQuery, because the viewer expects
// null, not an error, from someone who may not read. The check is the same
// one: a signed-in user who still exists and is a system admin.
const isSystemAdmin = async (context: { auth: Auth; db: DatabaseReader }) => {
  const userId = await getAuthUserId(context);
  if (userId === null) return false;
  const user = await context.db.get(userId);
  return user !== null && users.hasRole(user, "systemAdmin");
};

const viewer = machines.viewer({ read: isSystemAdmin });

export const overview = query({
  args: viewerArgs.overview,
  handler: (context) => viewer.overview(context),
});
export const counts = query({
  args: viewerArgs.counts,
  handler: (context, args) => viewer.counts(context, args),
});
export const rows = query({
  args: viewerArgs.rows,
  handler: (context, args) => viewer.rows(context, args),
});
export const row = query({
  args: viewerArgs.row,
  handler: (context, args) => viewer.row(context, args),
});
