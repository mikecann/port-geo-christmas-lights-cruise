import { AnalyticsObserver } from "./analytics/AnalyticsObserver";
import { Layout } from "./common/layout/Layout";
import type { Route } from "type-route";
import { exhaustiveCheck } from "../shared/misc";
import { AuthRequired } from "./auth/AuthRequired";
import { routeGroups, useRoute } from "./routes";
import type { Id } from "../convex/_generated/dataModel";
import { LazyLoadWrapper } from "./common/components/LazyLoadWrapper";
import { PageErrorBoundary } from "./common/components/PageErrorBoundary";
import * as LazyPages from "./common/lazy/LazyPages";

export default function App() {
  const route = useRoute();
  return (
    <Layout>
      <AnalyticsObserver />
      <PageErrorBoundary resetKey={route.href}>
        <LazyLoadWrapper>
          <AppRoutes />
        </LazyLoadWrapper>
      </PageErrorBoundary>
    </Layout>
  );
}

export function AppRoutes() {
  const route = useRoute();

  if (route.name === "home") return <LazyPages.HomePage />;

  if (route.name === "entries") return <LazyPages.EntriesGalleryPage />;

  if (routeGroups.entry.has(route))
    return <LazyPages.EntryPage route={route} />;

  if (route.name === "voteByNumber")
    return (
      <LazyPages.VoteByNumberPage entryNumber={route.params.entryNumber} />
    );

  if (route.name === "voteLanding") return <LazyPages.VoteLandingPage />;

  if (route.name == "map") return <LazyPages.MapPage />;

  if (route.name == "mapEntry")
    return (
      <LazyPages.MapPage
        selectedEntryId={route.params.entryId as Id<"entries">}
      />
    );

  if (route.name === "signin") return <LazyPages.SignInPage />;

  if (route.name === "tickets") return <LazyPages.TicketsPage />;
  if (route.name === "competitionDetails")
    return <LazyPages.CompetitionDetailsPage />;

  if (route.name == false) return <LazyPages.NotFoundPage />;

  if (routeGroups.authed.has(route))
    return (
      <AuthRequired>
        <LazyPages.AccountShell route={route}>
          <AuthedRoutes route={route} />
        </LazyPages.AccountShell>
      </AuthRequired>
    );

  exhaustiveCheck(route);
}

function AuthedRoutes({ route }: { route: Route<typeof routeGroups.authed> }) {
  if (route.name === "settings") return <LazyPages.SettingsPage />;
  if (route.name === "myEntries") return <LazyPages.MyEntriesPage />;
  if (route.name === "myVotes") return <LazyPages.MyVotesPage />;

  if (routeGroups.admin.has(route)) return <AdminRoutes route={route} />;

  exhaustiveCheck(route);
}

function AdminRoutes({ route }: { route: Route<typeof routeGroups.admin> }) {
  return (
    <LazyPages.AdminLayout route={route}>
      <AdminPage route={route} />
    </LazyPages.AdminLayout>
  );
}

function AdminPage({ route }: { route: Route<typeof routeGroups.admin> }) {
  if (route.name === "admin") return <LazyPages.AdminHomePage />;
  if (route.name === "adminEntries") return <LazyPages.AdminEntriesPage />;
  if (route.name === "adminEntry")
    return (
      // Keyed so going from one entry to another (the clash links) starts
      // fresh, with the number editor closed
      <LazyPages.AdminEntryPage
        key={route.params.entryId}
        entryId={route.params.entryId as Id<"entries">}
      />
    );
  if (route.name === "adminNumbers") return <LazyPages.AdminNumbersPage />;
  if (route.name === "adminVotes") return <LazyPages.AdminVotesPage />;
  if (route.name === "adminPeople") return <LazyPages.AdminPeoplePage />;
  if (route.name === "adminSettings") return <LazyPages.AdminSettingsPage />;
  if (route.name === "adminSystem") return <LazyPages.AdminDangerZonePage />;
  if (route.name === "adminMachines")
    return <LazyPages.AdminMachinesPage entryId={route.params.entry} />;

  exhaustiveCheck(route);
}
