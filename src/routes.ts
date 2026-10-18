import { createGroup, createRouter, defineRoute, param } from "type-route";

const mapBase = defineRoute("/map");

const entry = defineRoute(
  { entryId: param.path.string },
  (q) => `/entries/${q.entryId}`,
);

const admin = defineRoute("/admin");

export const { RouteProvider, useRoute, routes } = createRouter({
  home: defineRoute("/"),
  entries: defineRoute("/entries"),
  entry,
  entryVote: entry.extend("/vote"),
  // The short link on each house sign's QR code
  voteByNumber: defineRoute(
    { entryNumber: param.path.string },
    (q) => `/v/${q.entryNumber}`,
  ),
  // The QR code on the boat: type the number on the sign
  voteLanding: defineRoute("/vote"),
  map: mapBase,
  mapEntry: mapBase.extend(
    { entryId: param.path.string },
    (q) => `/${q.entryId}`,
  ),
  signin: defineRoute(
    {
      // Optional so a plain /signin works; the page falls back to the map
      returnTo: param.query.optional.string,
      // While sign-ups are closed, ?unlock=true shows the sign-in button so
      // admins can get in. It isn't a secret: the server only lets existing
      // accounts sign in then (IS_SIGNUP_DISABLED in convex/auth.ts).
      unlock: param.query.optional.boolean,
      // Added to the address people come back to after Google while sign-ups
      // are closed. Back with it but no session means the sign-in was turned
      // away.
      attempted: param.query.optional.boolean,
    },
    () => "/signin",
  ),
  tickets: defineRoute("/tickets"),
  competitionDetails: defineRoute("/competition-details"),
  settings: defineRoute("/settings"),
  myEntries: defineRoute("/my-entries"),
  myVotes: defineRoute("/my-votes"),
  admin,
  adminEntries: admin.extend("/entries"),
  adminVotes: admin.extend("/votes"),
  adminSystem: admin.extend("/system"),
  adminUsers: admin.extend("/users"),
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
    routes.adminUsers,
  ]),
  map: createGroup([routes.map, routes.mapEntry]),
  entry: createGroup([routes.entry, routes.entryVote]),
  admin: createGroup([
    routes.admin,
    routes.adminEntries,
    routes.adminVotes,
    routes.adminSystem,
    routes.adminUsers,
  ]),
};
