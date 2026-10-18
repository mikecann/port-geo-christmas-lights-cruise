import { Email } from "@convex-dev/auth/providers/Email";
import type { ConvexAuthConfig } from "@convex-dev/auth/server";
import type {
  AnyDataModel,
  GenericMutationCtx,
  WithoutSystemFields,
} from "convex/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type {
  ActionCtx,
  DatabaseReader,
  MutationCtx,
} from "../../_generated/server";
import {
  EMAIL_CODE_PROVIDER_ID,
  normalizeEmail,
  SIGN_IN_CODE_LENGTH,
  SIGN_IN_CODE_LIFETIME_MINUTES,
} from "../../../shared/auth";
import { ensure } from "../../../shared/ensure";
import { email } from "../email/model";
import { enforceRateLimit } from "../rateLimits/lib";

export const SIGNUPS_CLOSED_MESSAGE =
  "New sign-ups are closed for now, so no account was created. If you already have an account, use the email address or Google account you signed up with.";

export const INVALID_EMAIL_MESSAGE = "Please check your email address.";

// Case and surrounding spaces are ignored, and "1" works too, so a slightly
// off value in the dashboard still does what it says
const isEnvFlagOn = (name: string) => {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "true" || value === "1";
};

// A comma-separated list of emails in a Convex env var
const emailList = (name: string) =>
  (process.env[name] ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter((address: string) => address !== "");

const looksLikeEmail = (address: string) =>
  address.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);

const isLocalSiteUrl = (siteUrl: string | undefined) => {
  if (!siteUrl) return false;
  try {
    const { hostname } = new URL(siteUrl);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

export const signInAccess = {
  // Off-season switch, set on the Convex deployment: IS_SIGNUP_DISABLED=true.
  // While it's on, existing accounts (admins included) can still sign in, but
  // no sign-in method can create new ones. The gate on the sign-in page is
  // only UI; this is what enforces it.
  isSignupDisabled: () => isEnvFlagOn("IS_SIGNUP_DISABLED"),

  isCompetitionAdminEmail: (address: string) =>
    emailList("COMPETITION_ADMIN_EMAILS").includes(normalizeEmail(address)),

  // People on SIGNUP_ALLOWED_EMAILS can make an account while sign-ups are
  // closed. Admins-to-be on COMPETITION_ADMIN_EMAILS can too, so they don't
  // need listing twice.
  canSignUp(address: string | undefined) {
    if (!signInAccess.isSignupDisabled()) return true;
    if (address === undefined) return false;
    return (
      emailList("SIGNUP_ALLOWED_EMAILS").includes(normalizeEmail(address)) ||
      signInAccess.isCompetitionAdminEmail(address)
    );
  },

  // The email service won't send from dev, so AUTH_LOG_SIGNIN_CODES=true on
  // the dev deployment puts codes in the Convex logs instead. It only works
  // when SITE_URL is localhost, so setting it anywhere else by mistake can't
  // hand codes to anyone reading the logs.
  shouldLogSignInCodes: () =>
    isEnvFlagOn("AUTH_LOG_SIGNIN_CODES") &&
    isLocalSiteUrl(process.env.SITE_URL),
};

// Rejection sampling, so every code is equally likely
const randomDigits = (length: number) => {
  const limit = 10 ** length;
  const unbiasedMax = Math.floor(2 ** 32 / limit) * limit;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = ensure(buffer[0]);
    if (value < unbiasedMax) return String(value % limit).padStart(length, "0");
  }
};

// Convex Auth checks the code together with the email it was sent to, and
// turns an email away after 10 wrong codes in an hour
export const emailCodeProvider = Email({
  id: EMAIL_CODE_PROVIDER_ID,
  maxAge: SIGN_IN_CODE_LIFETIME_MINUTES * 60,
  generateVerificationToken: async () => randomDigits(SIGN_IN_CODE_LENGTH),
  // Convex Auth passes the action context as a second argument
  async sendVerificationRequest({ identifier, token }, ctx?: ActionCtx) {
    if (signInAccess.shouldLogSignInCodes()) {
      console.log(`Sign-in code for ${identifier}: ${token}`);
      return;
    }
    if (isEnvFlagOn("AUTH_LOG_SIGNIN_CODES"))
      console.warn(
        "AUTH_LOG_SIGNIN_CODES only works when SITE_URL is localhost, so the code was emailed",
      );
    await email.sendSignInCode(ensure(ctx), { to: identifier, code: token });
  },
});

// Prefers a verified user. An unverified one only comes from a code that was
// asked for and never used, so it has never been signed in to. Test users
// have made-up emails that could belong to someone real, so they never match.
async function findUserIdByEmail(db: DatabaseReader, emails: string[]) {
  const matches: Doc<"users">[] = [];
  for (const address of new Set(emails))
    matches.push(
      ...(await db
        .query("users")
        .withIndex("email", (q) => q.eq("email", address))
        .take(10)),
    );
  const people = matches.filter((user) => user.isTestUser !== true);
  const user =
    people.find((user) => user.emailVerificationTime !== undefined) ??
    people[0];
  return user?._id ?? null;
}

type CreateOrUpdateUserArgs = Parameters<
  NonNullable<NonNullable<ConvexAuthConfig["callbacks"]>["createOrUpdateUser"]>
>[1];

// Replaces Convex Auth's default so one email is one user whichever way they
// sign in, emails match ignoring case, and the sign-up lock and admin list
// apply to every method. It runs in the same mutation that creates the
// account, so throwing leaves nothing behind.
export async function createOrUpdateUser(
  genericCtx: GenericMutationCtx<AnyDataModel>,
  args: CreateOrUpdateUserArgs,
): Promise<Id<"users">> {
  const ctx = genericCtx as unknown as MutationCtx;
  const { emailVerified, ...profile } = args.profile;
  // Like Convex Auth's default, Google's email counts as verified. A code's
  // email is verified once the code is checked, which is type "verification".
  const isVerified =
    emailVerified ??
    (args.provider.type === "oauth" || args.provider.type === "oidc");
  const rawEmail = profile.email;
  const address = rawEmail === undefined ? undefined : normalizeEmail(rawEmail);

  // Asking for a code: nobody has shown they own the address yet
  if (args.type === "email") {
    if (
      address === undefined ||
      address !== rawEmail ||
      !looksLikeEmail(address)
    )
      throw new ConvexError(INVALID_EMAIL_MESSAGE);
    await enforceRateLimit(ctx, "sendSignInCode", address);
  }

  // The raw email too, for users saved before emails were normalised
  let userId =
    args.existingUserId ??
    (rawEmail === undefined || address === undefined
      ? null
      : await findUserIdByEmail(ctx.db, [address, rawEmail]));

  // Nothing changes on an existing user until the code is checked
  if (args.type === "email" && userId !== null) return userId;

  const fields = {
    ...profile,
    ...(address === undefined ? {} : { email: address }),
    ...(isVerified ? { emailVerificationTime: Date.now() } : {}),
  } as WithoutSystemFields<Doc<"users">>;

  if (userId === null) {
    if (!signInAccess.canSignUp(address))
      throw new ConvexError(SIGNUPS_CLOSED_MESSAGE);
    userId = await ctx.db.insert("users", fields);
  } else await ctx.db.patch(userId, fields);

  // Only ever adds the role. Taking someone off the list doesn't remove it;
  // that's done on the admin users page.
  if (
    isVerified &&
    address !== undefined &&
    signInAccess.isCompetitionAdminEmail(address)
  )
    await ctx.db.patch(userId, { isCompetitionAdmin: true });

  return userId;
}
