import { getAuthUserId } from "@convex-dev/auth/server";
import type { Auth } from "convex/server";
import { ConvexError } from "convex/values";
import type { DatabaseReader } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { convex } from "../../schema";
import { mutation, NOT_SIGNED_IN_MESSAGE } from "./lib";
import type { Role } from "../users/model";
import { users } from "../users/model";

export const NOT_ALLOWED_MESSAGE = "You don't have permission to do that.";

type ReaderContext = { auth: Auth; db: DatabaseReader };

async function findSignedInUser(context: ReaderContext) {
  const userId = await getAuthUserId(context);
  if (userId === null) return null;
  return await context.db.get(userId);
}

async function requireSignedInUserId(context: { auth: Auth }) {
  const userId = await getAuthUserId(context);
  if (userId === null) throw new ConvexError(NOT_SIGNED_IN_MESSAGE);
  return userId;
}

const withOptionalUser = convex
  .$context<ReaderContext>()
  .createMiddleware(async (context, next) =>
    next({ ...context, user: await findSignedInUser(context) }),
  );

const requireUser = (role?: Role) =>
  convex.$context<ReaderContext>().createMiddleware(async (context, next) => {
    // A deleted user can still hold a valid session, so treat them as signed out
    const user = await findSignedInUser(context);
    if (!user) throw new ConvexError(NOT_SIGNED_IN_MESSAGE);
    if (role && !users.hasRole(user, role))
      throw new ConvexError(NOT_ALLOWED_MESSAGE);
    return next({ ...context, userId: user._id, user });
  });

// Actions can't read the database, so the role check goes through a query
const requireActionUser = (role?: Role) =>
  convex.action().createMiddleware(async (context, next) => {
    const userId = await requireSignedInUserId(context);
    if (
      role &&
      !(await context.runQuery(internal.internal.users.hasRole, {
        userId,
        role,
      }))
    )
      throw new ConvexError(NOT_ALLOWED_MESSAGE);
    return next({ ...context, userId });
  });

// For public pages that show more when someone is signed in
export const optionalUserQuery = convex.query().use(withOptionalUser);

export const userQuery = convex.query().use(requireUser());
export const userMutation = mutation.use(requireUser());
export const userAction = convex.action().use(requireActionUser());

export const competitionAdminQuery = convex
  .query()
  .use(requireUser("competitionAdmin"));
export const competitionAdminMutation = mutation.use(
  requireUser("competitionAdmin"),
);
export const competitionAdminAction = convex
  .action()
  .use(requireActionUser("competitionAdmin"));

export const systemAdminQuery = convex.query().use(requireUser("systemAdmin"));
export const systemAdminMutation = mutation.use(requireUser("systemAdmin"));
