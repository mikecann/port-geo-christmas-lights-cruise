import { routeGroups, useRoute } from "../../routes";
import { MainAppShell } from "./MainAppShell";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const route = useRoute();
  // Signed-in pages (your entry, votes, account and the admin) have their own
  // frame, AccountShell, with a sidebar instead of the public header and footer
  if (routeGroups.authed.has(route)) return <>{children}</>;
  return <MainAppShell>{children}</MainAppShell>;
}
