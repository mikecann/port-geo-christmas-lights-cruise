import { ActionIcon, Tooltip } from "@mantine/core";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

// One round button in the corner of the map, styled like Google's own map
// controls. Every location state draws the same button with a different icon.
// It forwards its ref and any extra props to the ActionIcon so it can be a
// Popover.Target itself, which puts aria-expanded on the real button.
export const LocateButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    onClick?: () => void;
    loading?: boolean;
    // Following you around: the icon goes solid blue
    active?: boolean;
    children: ReactNode;
  } & Omit<ComponentPropsWithoutRef<"button">, "children" | "onClick">
>(function LocateButton(
  { label, onClick, loading, active, children, ...rest },
  ref,
) {
  return (
    <Tooltip
      label={label}
      position="left"
      // Hover only: on a phone the tip would stay up after every tap
      events={{ hover: true, focus: false, touch: false }}
    >
      <ActionIcon
        {...rest}
        ref={ref}
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
});
