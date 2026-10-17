import type { DataModel } from "../../_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";
import { aggregateVotes } from "../votes/lib";
import { convex } from "../../schema";

// Using triggers to keep the aggregates up to date automatically for us in our mutations
const triggers = new Triggers<DataModel>();
triggers.register("votes", aggregateVotes.trigger());

// Every mutation, internal ones included, is built from this so the triggers
// always run. A plain convex.mutation() would let the vote counts drift.
// eslint-disable-next-line no-restricted-syntax
export const mutation = convex.mutation().use(
  // eslint-disable-next-line no-restricted-syntax
  convex
    .mutation()
    .createMiddleware(async (context, next) => next(triggers.wrapDB(context))),
);

export const NOT_SIGNED_IN_MESSAGE = "Please sign in and try again.";
