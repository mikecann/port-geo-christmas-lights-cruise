// The Convex Auth provider id for one-time sign-in codes sent by email
export const EMAIL_CODE_PROVIDER_ID = "email-code";

export const SIGN_IN_CODE_LENGTH = 6;
export const SIGN_IN_CODE_LIFETIME_MINUTES = 10;

// Emails are compared ignoring case and surrounding spaces, so
// " ZOliver@AigleRoyal.com.au" and "zoliver@aigleroyal.com.au" are one person
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

const GMAIL_DOMAINS = ["gmail.com", "googlemail.com"];

// One inbox can have many spellings: most providers deliver name+tag@ to
// name@, and Gmail also ignores dots and treats googlemail.com as gmail.com.
// This is only for spotting one person with several accounts (like voting
// twice). People still sign in with the email they typed.
export function canonicalEmail(email: string) {
  const address = normalizeEmail(email);
  const at = address.lastIndexOf("@");
  if (at <= 0) return address;
  let local = address.slice(0, at);
  let domain = address.slice(at + 1);
  local = local.split("+")[0] || local;
  if (GMAIL_DOMAINS.includes(domain)) {
    local = local.replace(/\./g, "") || local;
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}
