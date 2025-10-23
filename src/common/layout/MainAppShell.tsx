import { useEffect } from "react";
import { useDisclosure, useWindowScroll } from "@mantine/hooks";
import { AppShell, Group, Burger, Container } from "@mantine/core";
import { routes } from "../../routes";
import { useIsCompetitionAdmin, useIsSystemAdmin } from "../../auth/useMeHooks";
import { useRoute } from "../../routes";
import { MeOrSignIn } from "./MeOrSignIn";
import { TopLogo } from "./TopLogo";
import { MenuItem } from "../components/MenuItem";

interface MobileNavbarProps {
  children: React.ReactNode;
}

export function MainAppShell({ children }: MobileNavbarProps) {
  const [opened, { toggle, close }] = useDisclosure();
  const route = useRoute();
  const [{ y }] = useWindowScroll();

  // Close navbar when route changes
  useEffect(() => {
    close();
  }, [route, close]);

  const isHome = route.name === "home";
  const isScrolled = y > 30;
  const isTransparent = isHome && !isScrolled && !opened;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "xs",
        collapsed: { desktop: true, mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header
        style={{
          backgroundColor: isTransparent
            ? "transparent"
            : "var(--mantine-color-dark-8)",
          borderBottom: isTransparent
            ? "none"
            : "1px solid var(--mantine-color-dark-6)",
          boxShadow: undefined,
          transition: "opacity 150ms ease, background-color 150ms ease",
          pointerEvents: "auto",
          ["--menu-hover-bg" as string]: isTransparent
            ? "rgba(0, 0, 0, 0.28)"
            : "var(--mantine-color-dark-6)",
        }}
      >
        <Container size="lg" h="100%">
          <Group h="100%" px="md">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="xs"
              size="sm"
            />
            <Group justify="space-between" style={{ flex: 1 }}>
              <div
                style={{
                  opacity: isTransparent ? 0 : 1,
                  transition: "opacity 150ms ease",
                }}
                aria-hidden={isTransparent}
              >
                <TopLogo />
              </div>
              <Group gap={"xs"} visibleFrom="xs">
                <MenuItems />
                <MeOrSignIn />
              </Group>
              <Group gap={0} hiddenFrom="xs">
                <MeOrSignIn />
              </Group>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Navbar py="md" px={4} maw={200}>
        <MenuItems />
      </AppShell.Navbar>

      <AppShell.Main p={0} pt={isHome ? 0 : "60px"}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

function MenuItems() {
  return (
    <>
      <MenuItem link={routes.entries().link}>Entries</MenuItem>
      <MenuItem link={routes.tickets().link}>Tickets</MenuItem>
      <MenuItem link={routes.map().link}>Map</MenuItem>
    </>
  );
}
