/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_competition_competitions from "../admin/competition/competitions.js";
import type * as admin_competition_entries from "../admin/competition/entries.js";
import type * as admin_competition_numbers from "../admin/competition/numbers.js";
import type * as admin_competition_photos from "../admin/competition/photos.js";
import type * as admin_competition_users from "../admin/competition/users.js";
import type * as admin_competition_votes from "../admin/competition/votes.js";
import type * as admin_system_data from "../admin/system/data.js";
import type * as admin_system_email from "../admin/system/email.js";
import type * as admin_system_entries from "../admin/system/entries.js";
import type * as admin_system_lib from "../admin/system/lib.js";
import type * as admin_system_machines from "../admin/system/machines.js";
import type * as admin_system_users from "../admin/system/users.js";
import type * as admin_system_votes from "../admin/system/votes.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as features_auth_model from "../features/auth/model.js";
import type * as features_common_auth from "../features/common/auth.js";
import type * as features_common_lib from "../features/common/lib.js";
import type * as features_competitions_model from "../features/competitions/model.js";
import type * as features_email_model from "../features/email/model.js";
import type * as features_entries_machine from "../features/entries/machine.js";
import type * as features_entries_model from "../features/entries/model.js";
import type * as features_entries_numbers from "../features/entries/numbers.js";
import type * as features_entries_queries from "../features/entries/queries.js";
import type * as features_entries_testing from "../features/entries/testing.js";
import type * as features_map_lib from "../features/map/lib.js";
import type * as features_photos_lib from "../features/photos/lib.js";
import type * as features_photos_model from "../features/photos/model.js";
import type * as features_rateLimits_lib from "../features/rateLimits/lib.js";
import type * as features_users_model from "../features/users/model.js";
import type * as features_votes_lib from "../features/votes/lib.js";
import type * as features_votes_location from "../features/votes/location.js";
import type * as features_votes_model from "../features/votes/model.js";
import type * as features_votes_results from "../features/votes/results.js";
import type * as http from "../http.js";
import type * as internal_cleanup from "../internal/cleanup.js";
import type * as internal_competitions from "../internal/competitions.js";
import type * as internal_entries from "../internal/entries.js";
import type * as internal_photos from "../internal/photos.js";
import type * as internal_users from "../internal/users.js";
import type * as machines from "../machines.js";
import type * as migrations_entryState from "../migrations/entryState.js";
import type * as migrations_entryTimers from "../migrations/entryTimers.js";
import type * as my_entries from "../my/entries.js";
import type * as my_photos from "../my/photos.js";
import type * as my_votes from "../my/votes.js";
import type * as public_competitions from "../public/competitions.js";
import type * as public_entries from "../public/entries.js";
import type * as public_photos from "../public/photos.js";
import type * as public_user from "../public/user.js";
import type * as public_votes from "../public/votes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/competition/competitions": typeof admin_competition_competitions;
  "admin/competition/entries": typeof admin_competition_entries;
  "admin/competition/numbers": typeof admin_competition_numbers;
  "admin/competition/photos": typeof admin_competition_photos;
  "admin/competition/users": typeof admin_competition_users;
  "admin/competition/votes": typeof admin_competition_votes;
  "admin/system/data": typeof admin_system_data;
  "admin/system/email": typeof admin_system_email;
  "admin/system/entries": typeof admin_system_entries;
  "admin/system/lib": typeof admin_system_lib;
  "admin/system/machines": typeof admin_system_machines;
  "admin/system/users": typeof admin_system_users;
  "admin/system/votes": typeof admin_system_votes;
  auth: typeof auth;
  crons: typeof crons;
  "features/auth/model": typeof features_auth_model;
  "features/common/auth": typeof features_common_auth;
  "features/common/lib": typeof features_common_lib;
  "features/competitions/model": typeof features_competitions_model;
  "features/email/model": typeof features_email_model;
  "features/entries/machine": typeof features_entries_machine;
  "features/entries/model": typeof features_entries_model;
  "features/entries/numbers": typeof features_entries_numbers;
  "features/entries/queries": typeof features_entries_queries;
  "features/entries/testing": typeof features_entries_testing;
  "features/map/lib": typeof features_map_lib;
  "features/photos/lib": typeof features_photos_lib;
  "features/photos/model": typeof features_photos_model;
  "features/rateLimits/lib": typeof features_rateLimits_lib;
  "features/users/model": typeof features_users_model;
  "features/votes/lib": typeof features_votes_lib;
  "features/votes/location": typeof features_votes_location;
  "features/votes/model": typeof features_votes_model;
  "features/votes/results": typeof features_votes_results;
  http: typeof http;
  "internal/cleanup": typeof internal_cleanup;
  "internal/competitions": typeof internal_competitions;
  "internal/entries": typeof internal_entries;
  "internal/photos": typeof internal_photos;
  "internal/users": typeof internal_users;
  machines: typeof machines;
  "migrations/entryState": typeof migrations_entryState;
  "migrations/entryTimers": typeof migrations_entryTimers;
  "my/entries": typeof my_entries;
  "my/photos": typeof my_photos;
  "my/votes": typeof my_votes;
  "public/competitions": typeof public_competitions;
  "public/entries": typeof public_entries;
  "public/photos": typeof public_photos;
  "public/user": typeof public_user;
  "public/votes": typeof public_votes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  aggregateVotes: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateVotes">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  stateMachines: import("@convex-dev/state-machines/_generated/component.js").ComponentApi<"stateMachines">;
};
