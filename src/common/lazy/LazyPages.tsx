import { lazy } from "react";

export const HomePage = lazy(() => import("../../home/HomePage"));

export const SignInPage = lazy(() =>
  import("../../auth/SignInPage").then((module) => ({
    default: module.SignInPage,
  })),
);

export const NotFoundPage = lazy(() =>
  import("../NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);

export const TicketsPage = lazy(() => import("../../tickets/TicketsPage"));

export const CompetitionDetailsPage = lazy(
  () => import("../../competition/CompetitionDetailsPage"),
);

export const EntriesGalleryPage = lazy(
  () => import("../../entries/gallery/EntriesGalleryPage"),
);
export const EntryPage = lazy(() => import("../../entries/EntryPage"));

export const VoteByNumberPage = lazy(
  () => import("../../voting/VoteByNumberPage"),
);
export const VoteLandingPage = lazy(
  () => import("../../voting/VoteLandingPage"),
);

export const MapPage = lazy(() => import("../../map/MapPage"));

export const SettingsPage = lazy(
  () => import("../../authed/settings/SettingsPage"),
);
export const MyEntriesPage = lazy(
  () => import("../../authed/myEntries/MyEntriesPage"),
);
export const MyVotesPage = lazy(
  () => import("../../authed/myVotes/MyVotesPage"),
);

export const AdminLayout = lazy(() => import("../../authed/admin/AdminLayout"));
export const AdminOverviewPage = lazy(
  () => import("../../authed/admin/overview/OverviewPage"),
);
export const AdminEntriesPage = lazy(
  () => import("../../authed/admin/entries/EntriesPage"),
);
export const AdminEntryPage = lazy(
  () => import("../../authed/admin/entries/detail/EntryDetailPage"),
);
export const AdminNumbersPage = lazy(
  () => import("../../authed/admin/numbers/NumbersPage"),
);
export const AdminVotesPage = lazy(
  () => import("../../authed/admin/votes/VotesPage"),
);
export const AdminPeoplePage = lazy(
  () => import("../../authed/admin/people/PeoplePage"),
);
export const AdminDangerZonePage = lazy(
  () => import("../../authed/admin/dangerZone/DangerZonePage"),
);
export const AdminMachinesPage = lazy(
  () => import("../../authed/admin/machines/MachinesPage"),
);
