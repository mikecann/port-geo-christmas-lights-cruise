import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import {
  createConvexTest,
  type ConvexTest,
} from "./features/common/tests/testingHelpers.vitest";
import {
  DUPLICATE_EMAIL_MESSAGE,
  googleProvider,
  INVALID_EMAIL_MESSAGE,
  SIGNUPS_CLOSED_MESSAGE,
  signInAccess,
  UNVERIFIED_EMAIL_IN_USE_MESSAGE,
} from "./features/auth/model";
import { email } from "./features/email/model";
import { RATE_LIMITED_MESSAGE } from "./features/rateLimits/lib";
import { EMAIL_CODE_PROVIDER_ID } from "../shared/auth";
import { ensure } from "../shared/ensure";

// Drives the same internal mutation Convex Auth's Google callback calls once
// Google has handed back a profile, so the real account-linking code runs.
const signInWithGoogle = async (
  t: ConvexTest,
  googleAccountId: string,
  email: string,
  emailVerified = true,
) => {
  const signature = `signature-${googleAccountId}`;
  await t.run((ctx) => ctx.db.insert("authVerifiers", { signature }));
  return t.mutation(internal.auth.store, {
    args: {
      type: "userOAuth",
      provider: "google",
      providerAccountId: googleAccountId,
      profile: { email, emailVerified, name: "Test Person" },
      signature,
    },
  });
};

const googleUserId = (t: ConvexTest, googleAccountId: string) =>
  t.run(async (ctx) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "google").eq("providerAccountId", googleAccountId),
      )
      .unique();
    return account?.userId;
  });

// The same action the sign-in page calls. AUTH_LOG_SIGNIN_CODES is on in
// these tests, so the code comes back from the log rather than an email.
const requestCode = async (t: ConvexTest, address: string) => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    await t.action(api.auth.signIn, {
      provider: EMAIL_CODE_PROVIDER_ID,
      params: { email: address },
    });
    const line = log.mock.calls
      .map((call) => String(call[0]))
      .find((message) => message.startsWith("Sign-in code for "));
    return line?.split(": ").pop();
  } finally {
    log.mockRestore();
  }
};

// What the sign-in action runs for a code, minus making the session tokens
const enterCode = (t: ConvexTest, address: string, code: string | undefined) =>
  t.mutation(internal.auth.store, {
    args: {
      type: "verifyCodeAndSignIn",
      params: { email: address, code },
      provider: EMAIL_CODE_PROVIDER_ID,
      generateTokens: false,
      allowExtraProviders: false,
    },
  });

const signInWithCode = async (t: ConvexTest, address: string) => {
  const result = await enterCode(t, address, await requestCode(t, address));
  if (result === null || typeof result !== "object" || !("userId" in result))
    throw new Error("Code sign-in failed");
  return result.userId;
};

const countRows = (t: ConvexTest) =>
  t.run(async (ctx) => ({
    users: (await ctx.db.query("users").collect()).length,
    accounts: (await ctx.db.query("authAccounts").collect()).length,
  }));

const allUsers = (t: ConvexTest) =>
  t.run((ctx) => ctx.db.query("users").collect());

const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    SITE_URL: "http://localhost:5173",
    AUTH_LOG_SIGNIN_CODES: "true",
  };
  delete process.env.IS_SIGNUP_DISABLED;
  delete process.env.SIGNUP_ALLOWED_EMAILS;
  delete process.env.COMPETITION_ADMIN_EMAILS;
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe("email sign-in codes", () => {
  it("sends a 6-digit code that lasts 10 minutes", async () => {
    const t = createConvexTest();
    const before = Date.now();

    const code = await requestCode(t, "resident@example.com");

    expect(code).toMatch(/^\d{6}$/);
    const [stored] = await t.run((ctx) =>
      ctx.db.query("authVerificationCodes").collect(),
    );
    expect(stored?.expirationTime).toBeGreaterThanOrEqual(before + 10 * 60_000);
    expect(stored?.expirationTime).toBeLessThan(Date.now() + 11 * 60_000);
  });

  it("signs in with the code and marks the email verified", async () => {
    const t = createConvexTest();

    const userId = await signInWithCode(t, "resident@example.com");

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.email).toBe("resident@example.com");
    expect(user?.emailVerificationTime).toEqual(expect.any(Number));
  });

  it("turns away a wrong code and a code for a different email", async () => {
    const t = createConvexTest();
    const code = await requestCode(t, "resident@example.com");
    const wrong = code === "000000" ? "111111" : "000000";

    expect(await enterCode(t, "resident@example.com", wrong)).toBeNull();
    await expect(enterCode(t, "someone@example.com", code)).rejects.toThrow();
  });

  it("refuses something that isn't a tidy email address", async () => {
    const t = createConvexTest();

    for (const address of ["not-an-email", "Resident@Example.com", " a@b.co"])
      await expect(requestCode(t, address)).rejects.toThrow(
        INVALID_EMAIL_MESSAGE,
      );
    expect(await countRows(t)).toEqual({ users: 0, accounts: 0 });
  });

  it("allows 5 codes in a row per email, then makes people wait", async () => {
    const t = createConvexTest();
    for (let i = 0; i < 5; i++) await requestCode(t, "resident@example.com");

    await expect(requestCode(t, "resident@example.com")).rejects.toThrow(
      RATE_LIMITED_MESSAGE,
    );
    expect(await requestCode(t, "neighbour@example.com")).toMatch(/^\d{6}$/);
  });

  it("emails the code when AUTH_LOG_SIGNIN_CODES is off", async () => {
    delete process.env.AUTH_LOG_SIGNIN_CODES;
    const send = vi.spyOn(email, "sendSignInCode").mockResolvedValue();
    const t = createConvexTest();

    expect(await requestCode(t, "resident@example.com")).toBeUndefined();
    expect(send).toHaveBeenCalledWith(expect.anything(), {
      to: "resident@example.com",
      code: expect.stringMatching(/^\d{6}$/),
    });
  });

  it.each([
    "https://portgeochristmascruise.com.au",
    "https://www.portgeochristmascruise.com.au/",
    "https://port-geo-xmas.pages.dev",
    "https://localhost.example.com",
    "",
    "not a url",
  ])(
    "won't log codes when SITE_URL is %j, and emails them instead",
    async (siteUrl) => {
      process.env.SITE_URL = siteUrl;
      const send = vi.spyOn(email, "sendSignInCode").mockResolvedValue();
      vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(signInAccess.shouldLogSignInCodes()).toBe(false);
      // Convex Auth needs a real SITE_URL to get any further
      if (siteUrl === "" || siteUrl === "not a url") return;
      const t = createConvexTest();
      expect(await requestCode(t, "resident@example.com")).toBeUndefined();
      expect(send).toHaveBeenCalledOnce();
    },
  );

  it.each(["http://localhost:5173", "http://127.0.0.1:5173"])(
    "logs codes when SITE_URL is %j",
    (siteUrl) => {
      process.env.SITE_URL = siteUrl;
      expect(signInAccess.shouldLogSignInCodes()).toBe(true);
    },
  );

  it("only logs codes when AUTH_LOG_SIGNIN_CODES is on", () => {
    expect(signInAccess.shouldLogSignInCodes()).toBe(true);
    process.env.AUTH_LOG_SIGNIN_CODES = "false";
    expect(signInAccess.shouldLogSignInCodes()).toBe(false);
  });
});

describe("cleanupExpiredSignInCodes", () => {
  it("clears codes that have expired and keeps live ones", async () => {
    const t = createConvexTest();
    await requestCode(t, "resident@example.com");
    await requestCode(t, "neighbour@example.com");
    await t.run(async (ctx) => {
      const [first] = await ctx.db.query("authVerificationCodes").collect();
      if (first) await ctx.db.patch(first._id, { expirationTime: 0 });
    });

    expect(
      await t.mutation(internal.internal.cleanup.cleanupExpiredSignInCodes, {}),
    ).toEqual({ deleted: 1 });
    const left = await t.run((ctx) =>
      ctx.db.query("authVerificationCodes").collect(),
    );
    expect(left).toHaveLength(1);
  });
});

describe("one user per email, whichever way they sign in", () => {
  it("links a code sign-in to an earlier Google sign-in", async () => {
    const t = createConvexTest();
    await signInWithGoogle(t, "google-id", "resident@example.com");
    const [googleUser] = await allUsers(t);

    expect(await signInWithCode(t, "resident@example.com")).toBe(
      googleUser?._id,
    );
    expect(await countRows(t)).toEqual({ users: 1, accounts: 2 });
  });

  it("links a Google sign-in to an earlier code sign-in", async () => {
    const t = createConvexTest();
    const userId = await signInWithCode(t, "resident@example.com");

    await signInWithGoogle(t, "google-id", "resident@example.com");

    expect((await allUsers(t)).map((user) => user._id)).toEqual([userId]);
    expect(await countRows(t)).toEqual({ users: 1, accounts: 2 });
  });

  it("doesn't leave a second user behind when a code was asked for and never used", async () => {
    const t = createConvexTest();
    await requestCode(t, "resident@example.com");

    await signInWithGoogle(t, "google-id", "resident@example.com");
    const userId = await signInWithCode(t, "resident@example.com");

    const users = await allUsers(t);
    expect(users.map((user) => user._id)).toEqual([userId]);
    expect(users[0]?.emailVerificationTime).toEqual(expect.any(Number));
  });

  it("matches emails ignoring case", async () => {
    const t = createConvexTest();
    const userId = await signInWithCode(t, "resident@example.com");

    await signInWithGoogle(t, "google-id", "Resident@Example.com");

    expect(await countRows(t)).toEqual({ users: 1, accounts: 2 });
    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.email).toBe("resident@example.com");
  });

  it("matches an email saved with capitals before, by Google or once normalised", async () => {
    const t = createConvexTest();
    const insertUser = (email: string) =>
      t.run((ctx) =>
        ctx.db.insert("users", { email, emailVerificationTime: Date.now() }),
      );
    const googleUserId = await insertUser("Resident@Example.com");
    const otherUserId = await insertUser("Neighbour@Example.com");

    await signInWithGoogle(t, "google-id", "Resident@Example.com");
    expect(
      await t.mutation(internal.internal.users.normalizeEmails, {}),
    ).toEqual({ updated: 1 });
    expect(await signInWithCode(t, "neighbour@example.com")).toBe(otherUserId);

    expect(await countRows(t)).toEqual({ users: 2, accounts: 2 });
    const googleUser = await t.run((ctx) => ctx.db.get(googleUserId));
    expect(googleUser?.email).toBe("resident@example.com");
  });

  it("never signs anyone in as a made-up test user with the same email", async () => {
    const t = createConvexTest();
    const testUserId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "john.smith1@gmail.com",
        isTestUser: true,
      }),
    );

    expect(await signInWithCode(t, "john.smith1@gmail.com")).not.toBe(
      testUserId,
    );
    expect(await countRows(t)).toEqual({ users: 2, accounts: 1 });
  });
});

describe("only a verified email links to an existing user", () => {
  const insertVerifiedUser = (t: ConvexTest, email: string) =>
    t.run((ctx) =>
      ctx.db.insert("users", {
        email,
        emailVerificationTime: Date.now(),
        name: "Resident",
      }),
    );

  it("passes on Google's email_verified rather than assuming it", () => {
    const profile = googleProvider.profile?.(
      {
        sub: "google-id",
        email: "resident@example.com",
        email_verified: false,
        name: "Resident",
        picture: "https://example.com/me.png",
      } as never,
      {} as never,
    );
    expect(profile).toMatchObject({
      id: "google-id",
      email: "resident@example.com",
      emailVerified: false,
    });
  });

  it("asking for a code leaves the existing user alone until the code is used", async () => {
    const t = createConvexTest();
    const userId = await insertVerifiedUser(t, "resident@example.com");
    const before = await t.run((ctx) => ctx.db.get(userId));

    const code = await requestCode(t, "resident@example.com");

    expect(await t.run((ctx) => ctx.db.get(userId))).toEqual(before);
    const [account] = await t.run((ctx) =>
      ctx.db.query("authAccounts").collect(),
    );
    expect(account?.userId).not.toBe(userId);

    await enterCode(t, "resident@example.com", code);
    expect((await allUsers(t)).map((user) => user._id)).toEqual([userId]);
    const [linked] = await t.run((ctx) =>
      ctx.db.query("authAccounts").collect(),
    );
    expect(linked?.userId).toBe(userId);
  });

  it("won't link a Google account whose email Google hasn't verified", async () => {
    const t = createConvexTest();
    const userId = await insertVerifiedUser(t, "resident@example.com");

    await expect(
      signInWithGoogle(t, "google-id", "resident@example.com", false),
    ).rejects.toThrow(UNVERIFIED_EMAIL_IN_USE_MESSAGE);

    expect(await countRows(t)).toEqual({ users: 1, accounts: 0 });
    expect((await t.run((ctx) => ctx.db.get(userId)))?.name).toBe("Resident");
  });

  it("gives an unverified Google email its own user, which a code never links into", async () => {
    const t = createConvexTest();
    await signInWithGoogle(t, "google-id", "resident@example.com", false);
    const unverifiedId = await googleUserId(t, "google-id");
    expect(
      (await t.run((ctx) => ctx.db.get(ensure(unverifiedId))))
        ?.emailVerificationTime,
    ).toBeUndefined();

    const codeUserId = await signInWithCode(t, "resident@example.com");

    expect(codeUserId).not.toBe(unverifiedId);
    expect(await countRows(t)).toEqual({ users: 2, accounts: 2 });
  });

  it("won't link a verified Google sign-in into a user nobody has verified", async () => {
    const t = createConvexTest();
    await signInWithGoogle(t, "unverified-id", "resident@example.com", false);

    await signInWithGoogle(t, "verified-id", "resident@example.com");

    expect(await googleUserId(t, "verified-id")).not.toBe(
      await googleUserId(t, "unverified-id"),
    );
  });

  it("refuses to pick when more than one user has the email", async () => {
    const t = createConvexTest();
    await insertVerifiedUser(t, "resident@example.com");
    await insertVerifiedUser(t, "resident@example.com");

    await expect(signInWithCode(t, "resident@example.com")).rejects.toThrow(
      DUPLICATE_EMAIL_MESSAGE,
    );
    await expect(
      signInWithGoogle(t, "google-id", "resident@example.com"),
    ).rejects.toThrow(DUPLICATE_EMAIL_MESSAGE);
  });

  it("still signs in through an account that's already linked when the email is shared", async () => {
    const t = createConvexTest();
    await signInWithGoogle(t, "google-id", "resident@example.com");
    const userId = await googleUserId(t, "google-id");
    await insertVerifiedUser(t, "resident@example.com");

    await signInWithGoogle(t, "google-id", "resident@example.com");

    expect(await googleUserId(t, "google-id")).toBe(userId);
  });
});

describe("emails are compared ignoring case", () => {
  it("finds last year's Google user with capitals when they sign in with a code", async () => {
    const t = createConvexTest();
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "Mike@Gmail.com",
        emailVerificationTime: Date.now(),
      }),
    );
    await t.mutation(internal.internal.users.normalizeEmails, {});

    expect(await signInWithCode(t, "mike@gmail.com")).toBe(userId);
    expect(await countRows(t)).toEqual({ users: 1, accounts: 1 });
  });

  it("fills in the lower-case and canonical email for older users, once", async () => {
    const t = createConvexTest();
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", { email: "Mike.Cann+2025@Gmail.com" }),
    );

    expect(
      await t.mutation(internal.internal.users.normalizeEmails, {}),
    ).toEqual({ updated: 1 });
    expect(await t.run((ctx) => ctx.db.get(userId))).toMatchObject({
      email: "mike.cann+2025@gmail.com",
      canonicalEmail: "mikecann@gmail.com",
    });
    expect(
      await t.mutation(internal.internal.users.normalizeEmails, {}),
    ).toEqual({ updated: 0 });
  });

  it("saves the normalised and canonical email on every sign-in", async () => {
    const t = createConvexTest();
    await signInWithGoogle(t, "google-id", " John.Smith+Lights@GoogleMail.com");
    const codeUserId = await signInWithCode(t, "jane.doe+cruise@outlook.com");

    const googleId = ensure(await googleUserId(t, "google-id"));
    const google = await t.run((ctx) => ctx.db.get(googleId));
    expect(google).toMatchObject({
      email: "john.smith+lights@googlemail.com",
      canonicalEmail: "johnsmith@gmail.com",
    });
    expect(await t.run((ctx) => ctx.db.get(codeUserId))).toMatchObject({
      email: "jane.doe+cruise@outlook.com",
      canonicalEmail: "jane.doe@outlook.com",
    });
  });

  it("keeps different spellings of one Gmail inbox as separate sign-ins", async () => {
    const t = createConvexTest();
    const dotted = await signInWithCode(t, "john.smith@gmail.com");
    const plain = await signInWithCode(t, "johnsmith@gmail.com");

    expect(plain).not.toBe(dotted);
  });
});

describe("sign-up lock (IS_SIGNUP_DISABLED)", () => {
  beforeEach(() => {
    process.env.IS_SIGNUP_DISABLED = "true";
  });

  it("refuses a Google account that has no user yet and leaves nothing behind", async () => {
    const t = createConvexTest();

    await expect(
      signInWithGoogle(t, "new-google-id", "new@example.com"),
    ).rejects.toThrow("New sign-ups are closed");

    expect(await countRows(t)).toEqual({ users: 0, accounts: 0 });
  });

  it("refuses a code for an email with no user, before sending anything", async () => {
    const t = createConvexTest();

    await expect(requestCode(t, "new@example.com")).rejects.toThrow(
      SIGNUPS_CLOSED_MESSAGE,
    );

    expect(await countRows(t)).toEqual({ users: 0, accounts: 0 });
    expect(
      await t.run((ctx) => ctx.db.query("authVerificationCodes").collect()),
    ).toEqual([]);
  });

  it("still lets an existing account sign in", async () => {
    const t = createConvexTest();
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

    expect(await countRows(t)).toEqual({ users: 1, accounts: 1 });
  });

  it("still links a new Google account or a code to an existing user with the same verified email", async () => {
    const t = createConvexTest();
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "resident@example.com",
        emailVerificationTime: Date.now(),
      }),
    );

    await expect(
      signInWithGoogle(t, "other-google-id", "resident@example.com"),
    ).resolves.toEqual(expect.any(String));
    expect(await signInWithCode(t, "resident@example.com")).toBe(userId);

    expect(await countRows(t)).toEqual({ users: 1, accounts: 2 });
  });

  it.each(["TRUE", " True ", "1"])(
    "treats %j as on, so a slightly off dashboard value still locks",
    async (value) => {
      process.env.IS_SIGNUP_DISABLED = value;
      const t = createConvexTest();

      await expect(
        signInWithGoogle(t, "new-google-id", "new@example.com"),
      ).rejects.toThrow("New sign-ups are closed");

      expect(await countRows(t)).toEqual({ users: 0, accounts: 0 });
    },
  );

  it.each([undefined, "", "false", "0"])(
    "creates new accounts when the variable is %j",
    async (value) => {
      if (value === undefined) delete process.env.IS_SIGNUP_DISABLED;
      else process.env.IS_SIGNUP_DISABLED = value;
      const t = createConvexTest();

      await expect(
        signInWithGoogle(t, "new-google-id", "new@example.com"),
      ).resolves.toEqual(expect.any(String));
      await signInWithCode(t, "other@example.com");

      expect(await countRows(t)).toEqual({ users: 2, accounts: 2 });
    },
  );

  it("lets people on SIGNUP_ALLOWED_EMAILS make an account either way", async () => {
    process.env.SIGNUP_ALLOWED_EMAILS =
      " ZOliver@AigleRoyal.com.au , tjulian@aigleroyal.com.au,";
    const t = createConvexTest();

    await signInWithCode(t, "zoliver@aigleroyal.com.au");
    await signInWithGoogle(t, "google-id", "TJulian@aigleroyal.com.au");
    await expect(requestCode(t, "someone@example.com")).rejects.toThrow(
      SIGNUPS_CLOSED_MESSAGE,
    );

    expect(await countRows(t)).toEqual({ users: 2, accounts: 2 });
    const users = await allUsers(t);
    expect(users.some((user) => user.isCompetitionAdmin)).toBe(false);
  });

  it("lets people on COMPETITION_ADMIN_EMAILS make an account too", async () => {
    process.env.COMPETITION_ADMIN_EMAILS = "zoliver@aigleroyal.com.au";
    const t = createConvexTest();

    await signInWithCode(t, "zoliver@aigleroyal.com.au");

    expect(await countRows(t)).toEqual({ users: 1, accounts: 1 });
  });
});

describe("competition admins (COMPETITION_ADMIN_EMAILS)", () => {
  beforeEach(() => {
    process.env.COMPETITION_ADMIN_EMAILS =
      "ZOliver@AigleRoyal.com.au, tjulian@aigleroyal.com.au ";
  });

  it("makes a listed person a competition admin when they sign in with Google", async () => {
    const t = createConvexTest();

    await signInWithGoogle(t, "google-id", "tjulian@AIGLEROYAL.com.au");

    const [user] = await allUsers(t);
    expect(user?.isCompetitionAdmin).toBe(true);
    expect(user?.isSystemAdmin).toBeUndefined();
  });

  it("makes them an admin only once their code is checked", async () => {
    const t = createConvexTest();
    const code = await requestCode(t, "zoliver@aigleroyal.com.au");
    const [requested] = await allUsers(t);
    expect(requested?.isCompetitionAdmin).toBeUndefined();

    await enterCode(t, "zoliver@aigleroyal.com.au", code);

    const [signedIn] = await allUsers(t);
    expect(signedIn?.isCompetitionAdmin).toBe(true);
  });

  it("leaves everyone else alone", async () => {
    const t = createConvexTest();

    await signInWithCode(t, "resident@example.com");

    const [user] = await allUsers(t);
    expect(user?.isCompetitionAdmin).toBeUndefined();
  });

  it("doesn't take the role away from someone who is no longer listed", async () => {
    delete process.env.COMPETITION_ADMIN_EMAILS;
    const t = createConvexTest();
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "former@example.com",
        emailVerificationTime: Date.now(),
        isCompetitionAdmin: true,
      }),
    );

    await signInWithCode(t, "former@example.com");

    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.isCompetitionAdmin).toBe(true);
  });
});
