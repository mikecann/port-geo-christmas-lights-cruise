import { Layout } from "./common/layout/Layout";
import type { Route } from "type-route";
import { exhaustiveCheck } from "../shared/misc";
import { AuthRequired } from "./auth/AuthRequired";
import { routeGroups, useRoute } from "./routes";
import type { Id } from "../convex/_generated/dataModel";
import { LazyLoadWrapper } from "./common/components/LazyLoadWrapper";
import * as LazyPages from "./LazyPages";

export default function App() {
  return (
    <Layout>
      <LazyLoadWrapper>
        <AppRoutes />
      </LazyLoadWrapper>
    </Layout>
  );
}

export function AppRoutes() {
  const route = useRoute();

  if (route.name === "home") return <LazyPages.HomePage />;

  if (route.name === "entries") return <LazyPages.EntriesGalleryPage />;

  if (route.name === "entry" || route.name === "entryVote")
    return (
      <LazyPages.EntryPage
        entryId={route.params.entryId as Id<"entries">}
        isVote={route.name === "entryVote"}
      />
    );

  if (route.name == "map") return <LazyPages.MapPage />;

  if (route.name == "mapEntry")
    return (
      <LazyPages.MapPage
        selectedEntryId={route.params.entryId as Id<"entries">}
      />
    );

  if (route.name === "signin") return <LazyPages.SignInPage />;
  if (route.name === "testAuth") return <LazyPages.TestAuthPage />;
  if (route.name === "tickets") return <LazyPages.TicketsPage />;
  if (route.name === "competitionDetails")
    return <LazyPages.CompetitionDetailsPage />;

  if (route.name == false) return <LazyPages.NotFoundPage />;

  if (routeGroups.authed.has(route))
    return (
      <AuthRequired>
        <AuthedRoutes route={route} />
      </AuthRequired>
    );

  exhaustiveCheck(route);
}

function AuthedRoutes({ route }: { route: Route<typeof routeGroups.authed> }) {
  if (route.name === "settings") return <LazyPages.SettingsPage />;
  if (route.name === "myEntries") return <LazyPages.MyEntriesPage />;
  if (route.name === "myVotes") return <LazyPages.MyVotesPage />;
  if (route.name === "admin") return <LazyPages.AdminPage />;
  if (route.name === "adminEntries") return <LazyPages.EntryManagementPage />;
  if (route.name === "adminVotes") return <LazyPages.VoteManagementPage />;
  if (route.name === "adminSystem") return <LazyPages.SystemAdminPage />;

  exhaustiveCheck(route);
}
