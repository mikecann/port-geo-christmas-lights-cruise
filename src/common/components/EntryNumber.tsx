import type { CSSProperties } from "react";

// The number on the house sign, shown the same way everywhere (gallery, entry
// page, map pins, home page markers) so people learn to look for it. Plain
// markup rather than a Mantine Badge: Badge uppercases, and this renders inside
// Google Maps markers, dozens at a time.
export const ENTRY_NUMBER_BG = "#FBAF5D";
export const ENTRY_NUMBER_FG = "#0b1c3b";

const sizes = {
  xs: { fontSize: 11, padding: "1px 5px" },
  sm: { fontSize: 13, padding: "2px 7px" },
  md: { fontSize: 15, padding: "3px 9px" },
} as const;

export function EntryNumber({
  number,
  size = "sm",
  style,
}: {
  number: number;
  size?: keyof typeof sizes;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-label={`Number ${number}`}
      style={{
        display: "inline-block",
        backgroundColor: ENTRY_NUMBER_BG,
        color: ENTRY_NUMBER_FG,
        borderRadius: 999,
        fontWeight: 700,
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        ...sizes[size],
        ...style,
      }}
    >
      #{number}
    </span>
  );
}
