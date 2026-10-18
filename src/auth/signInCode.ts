import { SIGN_IN_CODE_LENGTH } from "../../shared/auth";

// Keeps just the digits, so pasting "123 456" or the email's subject line
// still gives the code
export const codeDigits = (value: string) =>
  value.replace(/\D/g, "").slice(0, SIGN_IN_CODE_LENGTH);
