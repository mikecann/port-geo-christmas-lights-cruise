import schema from "../schema";
import { testingMutation, testingQuery } from "./lib";
import { v } from "convex/values";
import { createMockEntries as createMockEntriesHelper } from "../features/entries/testing";
import { ensure } from "../../shared/ensure";
import { queryServicesMiddleware, mutationServicesMiddleware } from "../features/services";

export const clearAll = testingMutation
  .input({})
  .returns(v.null())
  .handler(async ({ context }) => {
    for (const table of Object.keys(schema.tables)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docs = await context.db.query(table as any).collect();
      await Promise.all(docs.map((doc) => context.db.delete(doc._id)));
    }
    const scheduled = await context.db.system
      .query("_scheduled_functions")
      .collect();
    await Promise.all(scheduled.map((s) => context.scheduler.cancel(s._id)));
    const storedFiles = await context.db.system.query("_storage").collect();
    await Promise.all(
      storedFiles.map((s) => context.storage.delete(s._id)),
    );
    console.log("Cleared all tables");
    return null;
  });

export const createMockEntries = testingMutation
  .use(mutationServicesMiddleware)
  .input({
    count: v.number(),
  })
  .handler(async ({ context, input }) => {
    return await createMockEntriesHelper(context, {
      count: input.count,
    });
  });

export const authenticateMe = testingMutation
  .input({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    isSystemAdmin: v.optional(v.boolean()),
    isCompetitionAdmin: v.optional(v.boolean()),
  })
  .returns(
    v.object({
      userId: v.id("users"),
      accountId: v.id("authAccounts"),
      sessionId: v.id("authSessions"),
      token: v.string(),
    }),
  )
  .handler(async ({ context, input }) => {
    // Create the user
    const userId = await context.db.insert("users", {
      name: input.name ?? "Test User",
      email: input.email ?? "test@example.com",
      emailVerificationTime: Date.now(),
      isSystemAdmin: input.isSystemAdmin ?? false,
      isCompetitionAdmin: input.isCompetitionAdmin ?? false,
      isTestUser: true,
    });

    // Create an auth account for the user
    const accountId = await context.db.insert("authAccounts", {
      userId,
      provider: "google",
      providerAccountId: `test-${userId}`,
    });

    // Create an auth session
    const sessionId = await context.db.insert("authSessions", {
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
  });

export const findEntryForUser = testingMutation
  .use(queryServicesMiddleware)
  .input({
    userId: v.id("users"),
  })
  .handler(async ({ context, input }) => {
    const { createUserQueryServices } = await import("../features/services");
    const userServices = createUserQueryServices(context, input.userId);
    return await userServices.entries.find();
  });

export const getUserByEmail = testingQuery
  .input({
    email: v.string(),
  })
  .handler(async ({ context, input }) => {
    const user = await context.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", input.email))
      .unique();

    return ensure(user, `User with email ${input.email} not found`);
  });

export const listVotes = testingQuery
  .input({})
  .handler(async ({ context }) => {
    return await context.db.query("votes").collect();
  });

export const listEntries = testingQuery
  .input({})
  .handler(async ({ context }) => {
    return await context.db.query("entries").collect();
  });
