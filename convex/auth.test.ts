import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

// Drives the same internal mutation Convex Auth's Google callback calls once
// Google has handed back a profile, so the real account-linking code runs.
const signInWithGoogle = async (
  t: ReturnType<typeof convexTest>,
  googleAccountId: string,
  email: string,
) => {
  const signature = `signature-${googleAccountId}`;
  await t.run((ctx) => ctx.db.insert("authVerifiers", { signature }));
  return t.mutation(internal.auth.store, {
    args: {
      type: "userOAuth",
      provider: "google",
      providerAccountId: googleAccountId,
      profile: { email, emailVerified: true, name: "Test Person" },
      signature,
    },
  });
};

const countUsersAndAccounts = (t: ReturnType<typeof convexTest>) =>
  t.run(async (ctx) => ({
    users: (await ctx.db.query("users").collect()).length,
    accounts: (await ctx.db.query("authAccounts").collect()).length,
  }));

describe("sign-up lock (IS_SIGNUP_DISABLED)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, IS_SIGNUP_DISABLED: "true" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("refuses a Google account that has no user yet and leaves nothing behind", async () => {
    const t = convexTest(schema);

    await expect(
      signInWithGoogle(t, "new-google-id", "new@example.com"),
    ).rejects.toThrow("New sign-ups are closed");

    expect(await countUsersAndAccounts(t)).toEqual({ users: 0, accounts: 0 });
  });

  it("still lets an existing account sign in", async () => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        email: "admin@example.com",
        emailVerificationTime: Date.now(),
        isSystemAdmin: true,
      });
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "google",
        providerAccountId: "admin-google-id",
      });
    });

    await expect(
      signInWithGoogle(t, "admin-google-id", "admin@example.com"),
    ).resolves.toEqual(expect.any(String));

    expect(await countUsersAndAccounts(t)).toEqual({ users: 1, accounts: 1 });
  });

  it("still links a new Google account to an existing user with the same verified email", async () => {
    const t = convexTest(schema);
    await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "resident@example.com",
        emailVerificationTime: Date.now(),
      }),
    );

    await expect(
      signInWithGoogle(t, "other-google-id", "resident@example.com"),
    ).resolves.toEqual(expect.any(String));

    expect(await countUsersAndAccounts(t)).toEqual({ users: 1, accounts: 1 });
  });

  it("creates new accounts when the variable is not set", async () => {
    delete process.env.IS_SIGNUP_DISABLED;
    const t = convexTest(schema);

    await expect(
      signInWithGoogle(t, "new-google-id", "new@example.com"),
    ).resolves.toEqual(expect.any(String));

    expect(await countUsersAndAccounts(t)).toEqual({ users: 1, accounts: 1 });
  });
});
