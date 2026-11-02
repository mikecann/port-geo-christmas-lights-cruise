import { routeGroups, useRoute } from "../../routes";
import { MainAppShell } from "./MainAppShell";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const route = useRoute();
  // The admin area has its own frame (AdminLayout), with a sidebar instead
  // of the public header and footer, so it's clear you're in the admin
  if (routeGroups.admin.has(route)) return <>{children}</>;
  return <MainAppShell>{children}</MainAppShell>;
}
