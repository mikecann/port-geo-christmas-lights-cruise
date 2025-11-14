import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import type { DataModel, Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { convex } from "../schema";

/**
 * Testing-only auth provider that allows direct authentication with an email.
 * This provider is ONLY available when process.env.IS_TEST is set.
 *
 * Usage in tests:
 * ```
 * await signIn("testing", { email: "test@example.com" });
 * ```
 */
export const TestingCredentials = ConvexCredentials({
  id: "testing",
  authorize: async (
    credentials,
    ctx,
  ): Promise<{ userId: Id<"users"> } | null> => {
    console.log("TestingCredentials.authorize", credentials, ctx);

    if (process.env.IS_TEST === undefined)
      throw new ConvexError(
        "Testing provider is only available in test environment",
      );

    const email = credentials.email as string | undefined;
    if (!email)
      throw new ConvexError("Email is required for testing authentication");

    // Call internal mutation to find or create the user
    const userId: Id<"users"> = await ctx.runMutation(
      internal.testing.TestingCredentials.findOrCreateTestUser,
      {
        email,
        name: credentials.name as string | undefined,
        isSystemAdmin: credentials.isSystemAdmin === "true",
        isCompetitionAdmin: credentials.isCompetitionAdmin === "true",
      },
    );

    return { userId };
  },
});

/**
 * Internal mutation to find or create a test user
 */
export const findOrCreateTestUser = convex
  .mutation()
  .internal()
  .input({
    email: v.string(),
    name: v.optional(v.string()),
    isSystemAdmin: v.boolean(),
    isCompetitionAdmin: v.boolean(),
  })
  .returns(v.id("users"))
  .handler(async ({ context, input }) => {
    // Look for existing user with this email
    const existingUser = await context.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", input.email))
      .unique();

    if (existingUser) return existingUser._id;

    // Create new user
    const userId = await context.db.insert("users", {
      email: input.email,
      name: input.name ?? "Test User",
      emailVerificationTime: Date.now(),
      isSystemAdmin: input.isSystemAdmin,
      isCompetitionAdmin: input.isCompetitionAdmin,
      isTestUser: true,
    });

    return userId;
  });
