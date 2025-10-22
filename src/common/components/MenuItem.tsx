import { UnstyledButton } from "@mantine/core";

interface MenuItemProps {
  children: React.ReactNode;
  link: {
    href: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  };
}

export function MenuItem({ children, link }: MenuItemProps) {
  return (
    <UnstyledButton
      component="a"
      {...link}
      style={{
        display: "block",
        padding: "var(--mantine-spacing-xs) var(--mantine-spacing-md)",
        borderRadius: "var(--mantine-radius-md)",
        fontWeight: 500,
        transition: "background-color 100ms ease, opacity 100ms ease",
      }}
      onMouseEnter={(e) => {
        const hover = getComputedStyle(document.documentElement)
          .getPropertyValue("--menu-hover-bg")
          .trim();
        e.currentTarget.style.backgroundColor =
          hover || "rgba(255,255,255,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {children}
    </UnstyledButton>
  );
}
