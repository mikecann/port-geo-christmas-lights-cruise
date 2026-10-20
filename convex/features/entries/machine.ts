import { defineMachine } from "@convex-dev/state-machines";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import schema from "../../schema";
import { isWithinBoundary } from "../../../shared/geo";
import { users } from "../users/model";
import { competitions } from "../competitions/model";
import { entriesQuery } from "./queries";
import { draftHomeAddressValidator } from "./schema";

// An entry that's been submitting this long has lost its submit action, so
// it goes back to being a draft and lets go of its address
export const SUBMITTING_TIMEOUT_MS = 10 * 60 * 1000;

// Kept as constants so states that take the same event share its transition
const backToDraft = { to: "draft", effect: "backToDraft" } as const;
const setNumber = { guard: "numberIsFree", effect: "setNumber" } as const;
const renumber = { effect: "setNumber" } as const;
const linkPrevious = {
  guard: ["isEarlierApprovedEntry", "previousNumberIsFree"],
  effect: "linkPrevious",
} as const;
// What an admin can do to any entry that isn't rejected
const numbering = {
  SET_NUMBER: setNumber,
  RENUMBER: renumber,
  LINK_PREVIOUS: linkPrevious,
} as const;

// A competition entry, from the entrant starting it to an admin's review.
// Submitting looks the address up with Google in an action, which reports
// back as server events.
export const entry = defineMachine(
  schema,
  {
    name: "entry",
    table: "entries",
    callers: {
      owner: "Only the person who made this entry can do that.",
      admin: "You don't have permission to do that.",
    },
    events: {
      owner: {
        ENTER: {},
        EDIT: {
          name: v.optional(v.string()),
          houseAddress: v.optional(draftHomeAddressValidator),
        },
        SUBMIT: {},
        RENAME: { name: v.string() },
      },
      admin: {
        APPROVE: {},
        REJECT: { rejectedReason: v.string() },
        REOPEN: {},
        SET_NUMBER: { entryNumber: v.number() },
        LINK_PREVIOUS: { previousEntryId: v.id("entries") },
      },
      server: {
        GEOCODED: { lat: v.number(), lng: v.number(), placeId: v.string() },
        SUBMIT_FAILED: {},
        RENUMBER: { entryNumber: v.number() },
      },
    },
    guards: {
      entriesOpen: "Competition entries are currently closed",
      notEnteredYet: "You've already entered this year's competition.",
      hasAddress:
        "Please choose your house address from the suggestions before submitting.",
      hasName: "Please give your entry a name before submitting.",
      addressIsFree: "That address is already used by another entry.",
      withinBoundary:
        "That address is outside the competition area. Entries must be within the Port Geographe/Busselton region.",
      numberIsFree: "That number is already used by another entry this year.",
      isEarlierApprovedEntry:
        "Only an approved entry from an earlier year can be linked.",
      previousNumberIsFree:
        "That entry's number is already used by another entry this year.",
    },
    states: {
      start: {
        on: {
          ENTER: {
            to: "draft",
            guard: ["entriesOpen", "notEnteredYet"],
            effect: "startDraft",
          },
        },
      },
      draft: {
        on: {
          EDIT: { effect: "edit" },
          SUBMIT: {
            to: "submitting",
            guard: ["entriesOpen", "hasAddress", "hasName", "addressIsFree"],
            effect: "startSubmitting",
          },
          ...numbering,
        },
      },
      submitting: {
        timers: { TIMED_OUT: { after: SUBMITTING_TIMEOUT_MS } },
        on: {
          GEOCODED: {
            to: "submitted",
            guard: ["addressIsFree", "withinBoundary"],
            effect: "finishSubmission",
          },
          SUBMIT_FAILED: backToDraft,
          TIMED_OUT: backToDraft,
          ...numbering,
        },
      },
      submitted: {
        on: {
          APPROVE: { to: "approved", effect: "approve" },
          REJECT: { to: "rejected", effect: "reject" },
          ...numbering,
        },
      },
      approved: {
        on: {
          RENAME: { effect: "rename" },
          ...numbering,
        },
      },
      rejected: {
        on: { REOPEN: { to: "submitted", effect: "reopen" } },
      },
    },
  },
  {
    callers: {
      owner: async (ctx, { row }) =>
        (await getAuthUserId(ctx)) === row.submittedByUserId,
      admin: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        const user = userId && (await ctx.db.get(userId));
        return !!user && users.hasRole(user, "competitionAdmin");
      },
    },
    guards: {
      entriesOpen: async (ctx, { row }) =>
        (await competitions.query(ctx).forCompetition(row.competitionId).get())
          .entriesOpen,
      notEnteredYet: async (ctx, { row }) =>
        !(await entriesQuery(ctx)
          .forUser(row.competitionId, row.submittedByUserId)
          .find()),
      hasAddress: (_ctx, { state }) =>
        !!state.houseAddress?.address.trim() &&
        !!state.houseAddress.placeId.trim(),
      hasName: (_ctx, { state }) => !!state.name?.trim(),
      // Only one entry holds an address: submitting, submitted and approved
      // ones do, drafts and rejected ones don't
      addressIsFree: async (ctx, { id, row, state, event }) => {
        const placeId =
          event.type === "GEOCODED"
            ? event.placeId
            : state.houseAddress?.placeId;
        if (placeId === undefined) return false;
        return !(await entriesQuery(
          ctx,
        ).hasEntryWithPlaceIdAlreadyBeenSubmitted(
          row.competitionId,
          placeId,
          id,
        ));
      },
      withinBoundary: (_ctx, { event }) => isWithinBoundary(event),
      numberIsFree: async (ctx, { id, row, event }) =>
        !(await entriesQuery(ctx).listHeldNumbers(row.competitionId, id)).has(
          event.entryNumber,
        ),
      isEarlierApprovedEntry: async (ctx, { row, event }) => {
        const previous = await entriesQuery(ctx)
          .forEntry(event.previousEntryId)
          .findApproved();
        if (!previous) return false;
        const yearOf = async (id: typeof row.competitionId) =>
          (await competitions.query(ctx).forCompetition(id).get()).year;
        return (
          (await yearOf(previous.competitionId)) <
          (await yearOf(row.competitionId))
        );
      },
      previousNumberIsFree: async (ctx, { id, row, event }) => {
        const previous = await entriesQuery(ctx)
          .forEntry(event.previousEntryId)
          .getApproved();
        return !(
          await entriesQuery(ctx).listHeldNumbers(row.competitionId, id)
        ).has(previous.state.entryNumber);
      },
    },
    effects: {
      // Returning entrants start from last time's name and address and keep
      // their number if it's free. Photos aren't copied: they show this
      // year's display.
      startDraft: async (ctx, { row }) => {
        const previous =
          row.previousEntryId === undefined
            ? null
            : await entriesQuery(ctx)
                .forEntry(row.previousEntryId)
                .findApproved();
        if (!previous) return { kind: "draft" };
        const entryNumber = await entriesQuery(ctx).findKeepableNumber(
          row.competitionId,
          previous,
        );
        return {
          kind: "draft",
          name: previous.state.name,
          houseAddress: {
            address: previous.state.houseAddress.address,
            placeId: previous.state.houseAddress.placeId,
          },
          ...(entryNumber === null ? {} : { entryNumber }),
        };
      },
      edit: async (_ctx, { state, event }) => ({
        ...state,
        ...(event.name === undefined ? {} : { name: event.name }),
        ...(event.houseAddress === undefined
          ? {}
          : { houseAddress: event.houseAddress }),
      }),
      startSubmitting: async (_ctx, { state }) => {
        // The hasAddress and hasName guards have checked these
        if (!state.houseAddress || state.name === undefined)
          throw new Error("A draft needs a name and an address to submit");
        return {
          kind: "submitting",
          houseAddress: state.houseAddress,
          name: state.name,
          ...withNumber(state.entryNumber),
        };
      },
      backToDraft: async (_ctx, { state }) => ({
        kind: "draft",
        houseAddress: state.houseAddress,
        name: state.name,
        ...withNumber(state.entryNumber),
      }),
      finishSubmission: async (_ctx, { state, event }) => ({
        kind: "submitted",
        submittedAt: Date.now(),
        houseAddress: {
          address: state.houseAddress.address,
          lat: event.lat,
          lng: event.lng,
          placeId: event.placeId,
        },
        name: state.name,
        ...withNumber(state.entryNumber),
      }),
      // Keeps a returning entrant's reserved number, otherwise gives the
      // entry a new one. A number they couldn't keep when they started may
      // have been freed since.
      approve: async (ctx, { id, row, state }) => {
        const query = entriesQuery(ctx);
        const previous = await query.findPreviousOf(row);
        const entryNumber =
          state.entryNumber ??
          (previous &&
            (await query.findKeepableNumber(
              row.competitionId,
              previous,
              id,
            ))) ??
          (await query.getNextAvailableEntryNumber(row.competitionId, id));
        return {
          kind: "approved",
          submittedAt: state.submittedAt,
          approvedAt: Date.now(),
          entryNumber,
          houseAddress: state.houseAddress,
          name: state.name,
        };
      },
      reject: async (_ctx, { state, event }) => ({
        kind: "rejected",
        rejectedAt: Date.now(),
        rejectedReason: event.rejectedReason,
        submittedAt: state.submittedAt,
        houseAddress: state.houseAddress,
        name: state.name,
        ...withNumber(state.entryNumber),
      }),
      // Back in the review queue. Its old number may have gone to someone
      // else, so approval picks again.
      reopen: async (_ctx, { state }) => ({
        kind: "submitted",
        submittedAt: state.submittedAt,
        houseAddress: state.houseAddress,
        name: state.name,
      }),
      rename: async (_ctx, { state, event }) => ({
        ...state,
        name: event.name,
      }),
      setNumber: async (_ctx, { state, event }) => ({
        ...state,
        entryNumber: event.entryNumber,
      }),
      // For someone who signed in with a different account this year. The
      // entry takes the previous entry's number.
      linkPrevious: async (ctx, { id, state, event }) => {
        const previous = await entriesQuery(ctx)
          .forEntry(event.previousEntryId)
          .getApproved();
        await ctx.db.patch("entries", id, {
          previousEntryId: event.previousEntryId,
        });
        return { ...state, entryNumber: previous.state.entryNumber };
      },
    },
  },
);

// Leaves the field out rather than storing undefined
function withNumber(entryNumber: number | undefined) {
  return entryNumber === undefined ? {} : { entryNumber };
}
