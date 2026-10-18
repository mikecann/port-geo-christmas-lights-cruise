// The boat page's keypad. Sign numbers are at most 4 digits, and leading
// zeros drop off as you type, the way /v/007 is #7.
export const MAX_ENTRY_NUMBER_DIGITS = 4;

export const typeDigit = (value: string, digit: string) =>
  value.length >= MAX_ENTRY_NUMBER_DIGITS
    ? value
    : String(Number(value + digit));

export const deleteDigit = (value: string) => value.slice(0, -1);
