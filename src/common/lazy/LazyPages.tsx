import { lazyPage } from "./lazyPage";

export const HomePage = lazyPage(() => import("../../home/HomePage"));

export const SignInPage = lazyPage(() =>
  import("../../auth/SignInPage").then((module) => ({
    default: module.SignInPage,
  })),
);

export const NotFoundPage = lazyPage(() =>
  import("../NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);

export const TicketsPage = lazyPage(() => import("../../tickets/TicketsPage"));

export const CompetitionDetailsPage = lazyPage(
  () => import("../../competition/CompetitionDetailsPage"),
);

export const EntriesGalleryPage = lazyPage(
  () => import("../../entries/gallery/EntriesGalleryPage"),
);
export const EntryPage = lazyPage(() => import("../../entries/EntryPage"));

export const VoteByNumberPage = lazyPage(
  () => import("../../voting/VoteByNumberPage"),
);
export const VoteLandingPage = lazyPage(
  () => import("../../voting/VoteLandingPage"),
);

export const MapPage = lazyPage(() => import("../../map/MapPage"));

export const SettingsPage = lazyPage(
  () => import("../../authed/settings/SettingsPage"),
);
export const MyEntriesPage = lazyPage(
  () => import("../../authed/myEntries/MyEntriesPage"),
);
export const MyVotesPage = lazyPage(
  () => import("../../authed/myVotes/MyVotesPage"),
);

export const AccountShell = lazyPage(() => import("../../authed/AccountShell"));
export const AdminLayout = lazyPage(
  () => import("../../authed/admin/AdminLayout"),
);
export const AdminHomePage = lazyPage(
  () => import("../../authed/admin/home/HomePage"),
);
export const AdminEntriesPage = lazyPage(
  () => import("../../authed/admin/entries/EntriesPage"),
);
export const AdminEntryPage = lazyPage(
  () => import("../../authed/admin/entries/detail/EntryDetailPage"),
);
export const AdminNumbersPage = lazyPage(
  () => import("../../authed/admin/numbers/NumbersPage"),
);
export const AdminVotesPage = lazyPage(
  () => import("../../authed/admin/votes/VotesPage"),
);
export const AdminPeoplePage = lazyPage(
  () => import("../../authed/admin/people/PeoplePage"),
);
export const AdminSettingsPage = lazyPage(
  () => import("../../authed/admin/settings/SettingsPage"),
);
export const AdminDangerZonePage = lazyPage(
  () => import("../../authed/admin/dangerZone/DangerZonePage"),
);
export const AdminMachinesPage = lazyPage(
  () => import("../../authed/admin/machines/MachinesPage"),
);
