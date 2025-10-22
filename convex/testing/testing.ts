import schema from "../schema";
import { testingMutation } from "./lib";
import { v } from "convex/values";
import { entries } from "../features/entries/model";

export const clearAll = testingMutation({
  handler: async ({ db, scheduler, storage }) => {
    for (const table of Object.keys(schema.tables)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docs = await db.query(table as any).collect();
      await Promise.all(docs.map((doc) => db.delete(doc._id)));
    }
    const scheduled = await db.system.query("_scheduled_functions").collect();
    await Promise.all(scheduled.map((s) => scheduler.cancel(s._id)));
    const storedFiles = await db.system.query("_storage").collect();
    await Promise.all(storedFiles.map((s) => storage.delete(s._id)));
    console.log("Cleared all tables");
  },
});

export const createMockEntries = testingMutation({
  args: {
    count: v.number(),
  },
  handler: async (ctx, args) => {
    return await entries.testing.createMockEntries(ctx.db, {
      count: args.count,
    });
  },
});

export const authenticateMe = testingMutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    isSystemAdmin: v.optional(v.boolean()),
    isCompetitionAdmin: v.optional(v.boolean()),
  },
  returns: v.object({
    userId: v.id("users"),
    accountId: v.id("authAccounts"),
    sessionId: v.id("authSessions"),
    token: v.string(),
  }),
  handler: async (ctx, args) => {
    // Create the user
    const userId = await ctx.db.insert("users", {
      name: args.name ?? "Test User",
      email: args.email ?? "test@example.com",
      emailVerificationTime: Date.now(),
      isSystemAdmin: args.isSystemAdmin ?? false,
      isCompetitionAdmin: args.isCompetitionAdmin ?? false,
      isTestUser: true,
    });

    // Create an auth account for the user
    const accountId = await ctx.db.insert("authAccounts", {
      userId,
      provider: "google",
      providerAccountId: `test-${userId}`,
    });

    // Create an auth session
    const sessionId = await ctx.db.insert("authSessions", {
      userId,
      expirationTime: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // The session ID is used as the auth token
    const token = sessionId;

    return {
      userId,
      accountId,
      sessionId,
      token,
    };
  },
});
