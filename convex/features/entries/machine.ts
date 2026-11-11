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
const backToDraft = {
  to: "draft",
  effect: "backToDraft",
  description:
    "The address lookup failed or never reported back, so the entry goes back to being a draft and lets go of its address.",
} as const;
const setNumber = {
  guard: "numberIsFree",
  effect: "setNumber",
  description:
    "An admin gives the entry a number of their choosing, if no other entry this year has it.",
} as const;
const renumber = {
  effect: "setNumber",
  description:
    "A repair job gives a returning entrant's entry the number they had in an earlier year.",
} as const;
const linkPrevious = {
  guard: ["isEarlierApprovedEntry", "previousNumberIsFree"],
  effect: "linkPrevious",
  description:
    "An admin links the entry to the same household's approved entry from an earlier year, made with another account, and it takes that entry's number.",
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
    description:
      "A house's entry in the year's Christmas lights competition, from the entrant starting it to an admin approving it with a number for its sign.",
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
            description:
              "Someone starts their entry for this year while entries are open; a returning entrant starts from last time's name and address.",
          },
        },
      },
      draft: {
        description:
          "The entrant is filling in its name and house address; it doesn't hold the address yet, so another entry could still take it.",
        on: {
          EDIT: {
            effect: "edit",
            description:
              "The entrant changes the entry's name or house address.",
          },
          SUBMIT: {
            to: "submitting",
            guard: ["entriesOpen", "hasAddress", "hasName", "addressIsFree"],
            effect: "startSubmitting",
            description:
              "The entrant submits a named entry for an address no other entry holds, so the address is looked up with Google.",
          },
          ...numbering,
        },
      },
      submitting: {
        description:
          "Its address is being looked up with Google; it holds the address meanwhile, so nobody else can enter that house.",
        timers: {
          TIMED_OUT: {
            after: SUBMITTING_TIMEOUT_MS,
            description:
              "Ten minutes have passed with no word from the address lookup, so it must have been lost.",
          },
        },
        on: {
          GEOCODED: {
            to: "submitted",
            guard: ["addressIsFree", "withinBoundary"],
            effect: "finishSubmission",
            description:
              "Google found the address, inside the competition area and still free, so the entry goes to the admins for review.",
          },
          SUBMIT_FAILED: backToDraft,
          TIMED_OUT: backToDraft,
          ...numbering,
        },
      },
      submitted: {
        description:
          "Waiting for a competition admin to review it; it holds its address, so nobody else can enter that house.",
        on: {
          APPROVE: {
            to: "approved",
            effect: "approve",
            description:
              "An admin approves it and it gets its number: one it already has, a returning entrant's old one if free, or the next one available.",
          },
          REJECT: {
            to: "rejected",
            effect: "reject",
            description:
              "An admin rejects it with a reason, which the entrant is emailed.",
          },
          ...numbering,
        },
      },
      approved: {
        description:
          "In the competition, with its number for the house sign that people vote with.",
        on: {
          RENAME: {
            effect: "rename",
            description: "The entrant renames their approved entry.",
          },
          REJECT: {
            to: "rejected",
            effect: "reject",
            description:
              "An admin withdraws the entry, say if the display turns out unsuitable; it's the same as rejecting it, reason and email included.",
          },
          ...numbering,
        },
      },
      rejected: {
        description:
          "Turned down or withdrawn by an admin, with a reason; it lets go of its address, but a withdrawn entry keeps its number as its sign is out there.",
        on: {
          REOPEN: {
            to: "submitted",
            effect: "reopen",
            description:
              "An admin undoes the rejection, so it's back for review; a withdrawn entry keeps its number, and a rejected one gets one when approved.",
          },
        },
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
        // A withdrawn entry keeps holding its number (its sign is out there)
        ...(state.kind === "approved" ? { approvedAt: state.approvedAt } : {}),
      }),
      // Back in the review queue. A rejected entry's old number may have gone
      // to someone else, so approval picks again. A withdrawn one still holds
      // its number, so it keeps it.
      reopen: async (_ctx, { state }) => ({
        kind: "submitted",
        submittedAt: state.submittedAt,
        houseAddress: state.houseAddress,
        name: state.name,
        ...(state.approvedAt === undefined
          ? {}
          : withNumber(state.entryNumber)),
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
