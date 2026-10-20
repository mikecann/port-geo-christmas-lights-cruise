import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { defineTable } from "convex/server";
import { machineTimers } from "@convex-dev/state-machines";

export const commonEntryFields = {
  competitionId: v.id("competitions"),
  submittedByUserId: v.id("users"),
  // The same person's most recent approved entry in an earlier competition.
  // Entries started before this field existed don't have it, so read it
  // through entries.query().forEntry().findPrevious().
  previousEntryId: v.optional(v.id("entries")),
};

// Before approval this is a returning entrant's reserved number, kept from
// their previous entry. New entrants only get one when they're approved.
const reservedEntryNumber = v.optional(v.number());

export const homeAddressValidator = v.object({
  address: v.string(),
  lat: v.number(),
  lng: v.number(),
  placeId: v.string(),
});

export type HomeAddress = typeof homeAddressValidator.type;

export const draftHomeAddressValidator = v.object({
  address: v.string(),
  placeId: v.string(),
});
export type DraftHomeAddress = typeof draftHomeAddressValidator.type;

// The entry machine's states (convex/features/entries/machine.ts). Each holds
// only its own data, so a submitted entry always has a geocoded address.
export const entryState = v.union(
  v.object({
    kind: v.literal("draft"),
    houseAddress: v.optional(draftHomeAddressValidator),
    name: v.optional(v.string()),
    entryNumber: reservedEntryNumber,
  }),
  v.object({
    kind: v.literal("submitting"),
    houseAddress: draftHomeAddressValidator,
    name: v.string(),
    entryNumber: reservedEntryNumber,
  }),
  v.object({
    kind: v.literal("submitted"),
    submittedAt: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
    entryNumber: reservedEntryNumber,
  }),
  v.object({
    kind: v.literal("approved"),
    submittedAt: v.number(),
    approvedAt: v.number(),
    entryNumber: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
  }),
  v.object({
    kind: v.literal("rejected"),
    rejectedAt: v.number(),
    rejectedReason: v.string(),
    submittedAt: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
    // Kept as a record, but a rejected entry doesn't hold its number
    entryNumber: reservedEntryNumber,
  }),
);

export type EntryDoc = Doc<"entries">;
export type EntryState = EntryDoc["state"];
export type EntryStateKind = EntryState["kind"];
export type EntryInState<K extends EntryStateKind> = EntryDoc & {
  state: Extract<EntryState, { kind: K }>;
};
export type ApprovedEntryDoc = EntryInState<"approved">;

export const isInState =
  <K extends EntryStateKind>(...kinds: K[]) =>
  (entry: EntryDoc): entry is EntryInState<K> =>
    (kinds as EntryStateKind[]).includes(entry.state.kind);

// What anonymous visitors see of an approved entry: nothing about who entered
export const publicEntryValidator = v.object({
  _id: v.id("entries"),
  competitionId: v.id("competitions"),
  name: v.string(),
  entryNumber: v.number(),
  houseAddress: v.object({
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
  }),
});

export type PublicEntry = typeof publicEntryValidator.type;

export const entryTable = defineTable({
  // eslint-disable-next-line machines/no-optional-on-machine-tables -- previousEntryId is optional in every state: a new entrant has no previous entry, and entries from before the field existed were never linked
  ...commonEntryFields,
  state: entryState,
  stateTimers: machineTimers,
  // The old fields, until migrations/entryState:stripOldFields removes them
  /* eslint-disable machines/no-optional-on-machine-tables -- the old top-level fields, kept only until stripOldFields has run */
  status: v.optional(
    v.union(
      v.literal("draft"),
      v.literal("submitting"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
  ),
  houseAddress: v.optional(
    v.union(homeAddressValidator, draftHomeAddressValidator),
  ),
  name: v.optional(v.string()),
  entryNumber: v.optional(v.number()),
  submittedAt: v.optional(v.number()),
  approvedAt: v.optional(v.number()),
  rejectedAt: v.optional(v.number()),
  rejectedReason: v.optional(v.string()),
  /* eslint-enable machines/no-optional-on-machine-tables */
})
  .index("by_competitionId_and_status", ["competitionId", "state.kind"])
  .index("by_competitionId_and_submittedByUserId", [
    "competitionId",
    "submittedByUserId",
  ])
  .index("by_competitionId_and_entryNumber", [
    "competitionId",
    "state.entryNumber",
  ])
  .index("by_competitionId_and_homeAddress_placeId", [
    "competitionId",
    "state.houseAddress.placeId",
  ]);
