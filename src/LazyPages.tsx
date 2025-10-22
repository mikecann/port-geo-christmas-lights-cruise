import { lazy } from "react";

export const SignInPage = lazy(() =>
  import("./auth/SignInPage").then((module) => ({
    default: module.SignInPage,
  })),
);

export const TestAuthPage = lazy(() =>
  import("./debug/TestAuthPage").then((module) => ({
    default: module.TestAuthPage,
  })),
);

export const NotFoundPage = lazy(() =>
  import("./common/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);

export const HomePage = lazy(() => import("./home/HomePage"));

export const TicketsPage = lazy(() => import("./tickets/TicketsPage"));

export const EntriesGalleryPage = lazy(
  () => import("./entries/gallery/EntriesGalleryPage"),
);
export const EntryPage = lazy(() => import("./entries/EntryPage"));

export const MapPage = lazy(() => import("./map/MapPage"));

export const SettingsPage = lazy(
  () => import("./authed/settings/SettingsPage"),
);
export const MyEntriesPage = lazy(
  () => import("./authed/myEntries/MyEntriesPage"),
);
export const MyVotesPage = lazy(() => import("./authed/myVotes/MyVotesPage"));

export const AdminPage = lazy(() => import("./authed/admin/AdminPage"));
export const EntryManagementPage = lazy(
  () => import("./authed/admin/entries/EntryManagementPage"),
);
export const VoteManagementPage = lazy(
  () => import("./authed/admin/votes/VoteManagementPage"),
);
export const SystemAdminPage = lazy(
  () => import("./authed/admin/systemAdmin/SystemAdminPage"),
);
