import { createGroup, createRouter, defineRoute, param } from "type-route";

const mapBase = defineRoute("/map");

export const { RouteProvider, useRoute, routes } = createRouter({
  home: defineRoute("/"),
  entries: defineRoute("/entries"),
  entry: defineRoute(
    { entryId: param.path.string },
    (q) => `/entries/${q.entryId}`,
  ),
  entryVote: defineRoute(
    { entryId: param.path.string },
    (q) => `/entries/${q.entryId}/vote`,
  ),
  map: mapBase,
  mapEntry: mapBase.extend(
    { entryId: param.path.string },
    (q) => `/${q.entryId}`,
  ),
  signin: defineRoute(
    { returnTo: param.query.string, unlockPassword: param.query.optional.string },
    () => "/signin",
  ),
  testAuth: defineRoute("/test-auth"),
  tickets: defineRoute("/tickets"),
  competitionDetails: defineRoute("/competition-details"),
  settings: defineRoute("/settings"),
  myEntries: defineRoute("/my-entries"),
  myVotes: defineRoute("/my-votes"),
  admin: defineRoute("/admin"),
  adminEntries: defineRoute("/admin/entries"),
  adminVotes: defineRoute("/admin/votes"),
  adminSystem: defineRoute("/admin/system"),
});

export const routeGroups = {
  authed: createGroup([
    routes.settings,
    routes.myEntries,
    routes.myVotes,
    routes.admin,
    routes.adminEntries,
    routes.adminVotes,
    routes.adminSystem,
  ]),
  map: createGroup([routes.map, routes.mapEntry]),
};
