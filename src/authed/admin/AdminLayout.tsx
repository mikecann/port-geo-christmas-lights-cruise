import type { ReactNode } from "react";
import { Alert } from "@mantine/core";
import { IconShield } from "@tabler/icons-react";
import type { Route } from "type-route";
import { useMe } from "../../auth/useMeHooks";
import type { routeGroups } from "../../routes";

type AdminRoute = Route<typeof routeGroups.admin>;

// Who's allowed into each admin page. The frame round it is AccountShell,
// shared with the rest of the signed-in pages.
export default function AdminLayout({
  route,
  children,
}: {
  route: AdminRoute;
  children: ReactNode;
}) {
  const me = useMe();
  if (!me) return null;

  if (!me.isSystemAdmin && !me.isCompetitionAdmin)
    return (
      <Alert variant="light" color="red" icon={<IconShield size={16} />}>
        You don't have access to the admin area. If you should, ask one of the
        admins to add you on their People page.
      </Alert>
    );

  const isSystemAdminPage =
    route.name === "adminSystem" || route.name === "adminMachines";
  if (isSystemAdminPage && !me.isSystemAdmin)
    return (
      <Alert variant="light" color="red" icon={<IconShield size={16} />}>
        This page is only for system admins.
      </Alert>
    );

  return <>{children}</>;
}
