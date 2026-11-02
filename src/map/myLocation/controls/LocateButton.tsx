import { ActionIcon, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";

// One round button in the corner of the map, styled like Google's own map
// controls. Every location state draws the same button with a different icon.
export function LocateButton({
  label,
  onClick,
  loading,
  active,
  children,
}: {
  label: string;
  onClick?: () => void;
  loading?: boolean;
  // Following you around: the icon goes solid blue
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip
      label={label}
      position="left"
      // Hover only: on a phone the tip would stay up after every tap
      events={{ hover: true, focus: false, touch: false }}
    >
      <ActionIcon
        size={44}
        radius="xl"
        variant={active ? "filled" : "white"}
        color={active ? "blue" : "dark"}
        aria-label={label}
        loading={loading}
        onClick={onClick}
        style={{ boxShadow: "0 2px 6px rgba(0, 0, 0, 0.35)" }}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}
