// The Convex Auth provider id for one-time sign-in codes sent by email
export const EMAIL_CODE_PROVIDER_ID = "email-code";

export const SIGN_IN_CODE_LENGTH = 6;
export const SIGN_IN_CODE_LIFETIME_MINUTES = 10;

// Emails are compared ignoring case and surrounding spaces, so
// " ZOliver@AigleRoyal.com.au" and "zoliver@aigleroyal.com.au" are one person
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
