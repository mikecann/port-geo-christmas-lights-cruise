import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { DatabaseReader } from "../../_generated/server";
import { ensure } from "../../../shared/ensure";
import { match } from "ts-pattern";
import { competitions } from "../competitions/model";
import {
  isInState,
  type ApprovedEntryDoc,
  type EntryStateKind,
} from "./schema";
import { pickEntryNumber } from "./numbers";

// Reading entries, kept apart from the model so the entry machine's guards
// and effects can use it: the model sends the machine events, so the machine
// importing the model would be an import cycle.

export const ENTRY_UNAVAILABLE_MESSAGE =
  "Sorry, that entry isn't available. It may have been removed from the competition.";

// What reading entries needs: queries, mutations and the machine's guards
// and effects all have it
type ReaderCtx = { db: DatabaseReader };

export function ensureIsModifiable(entry: Doc<"entries">) {
  if (entry.state.kind !== "draft" && entry.state.kind !== "approved")
    throw new ConvexError(
      "Your entry can only be changed while it's a draft or once it's been approved.",
    );
  return entry;
}

export function entriesQuery(context: ReaderCtx) {
  const { db } = context;
  return {
    forEntry(entryId: Id<"entries">) {
      return {
        find() {
          return db.get(entryId);
        },

        async get() {
          const entry = await this.find();
          return ensure(entry, `Entry with id '${entryId}' not found`);
        },

        async findApproved() {
          const entry = await this.find();
          return entry && isInState("approved")(entry) ? entry : null;
        },

        async getApproved() {
          const entry = await this.findApproved();
          if (!entry) throw new ConvexError(ENTRY_UNAVAILABLE_MESSAGE);
          return entry;
        },
      };
    },

    forUser(competitionId: Id<"competitions">, userId: Id<"users">) {
      const findInCompetition = (id: Id<"competitions">) =>
        db
          .query("entries")
          .withIndex("by_competitionId_and_submittedByUserId", (q) =>
            q.eq("competitionId", id).eq("submittedByUserId", userId),
          )
          .unique();

      const listEarlierCompetitions = async (limit?: number) => {
        const competition = await competitions
          .query(context)
          .forCompetition(competitionId)
          .get();
        return await competitions
          .query(context)
          .listBeforeYear(competition.year, limit);
      };

      return {
        find() {
          return findInCompetition(competitionId);
        },

        async get() {
          const entry = await this.find();
          if (!entry)
            throw new ConvexError(
              "We couldn't find your entry. Please refresh the page and try again.",
            );
          return entry;
        },

        async getForModification() {
          const entry = await this.get();
          ensureIsModifiable(entry);
          return entry;
        },

        // Newest first, from competitions before this one
        async listPrevious() {
          const earlierCompetitions = await listEarlierCompetitions();
          const rows = await Promise.all(
            earlierCompetitions.map(async (competition) => ({
              competition,
              entry: await findInCompetition(competition._id),
            })),
          );
          return rows.filter(
            (row): row is typeof row & { entry: Doc<"entries"> } =>
              row.entry !== null,
          );
        },

        // Their most recent approved entry, even if they skipped a year
        async findPreviousApproved() {
          for (const earlier of await listEarlierCompetitions()) {
            const entry = await findInCompetition(earlier._id);
            if (entry && isInState("approved")(entry)) return entry;
          }
          return null;
        },
      };
    },

    // Entries started before previousEntryId existed fall back to looking
    // it up from the person's own earlier entries
    async findPreviousOf(entry: Doc<"entries">) {
      if (entry.previousEntryId === undefined)
        return await this.forUser(
          entry.competitionId,
          entry.submittedByUserId,
        ).findPreviousApproved();
      return await this.forEntry(entry.previousEntryId).findApproved();
    },

    // Numbers held by the competition's entries, reserved ones included
    async listHeldNumbers(
      competitionId: Id<"competitions">,
      excludeEntryId?: Id<"entries">,
    ) {
      const competitionEntries = await db
        .query("entries")
        .withIndex("by_competitionId_and_status", (q) =>
          q.eq("competitionId", competitionId),
        )
        .collect();
      const held = new Set<number>();
      for (const entry of competitionEntries)
        if (
          entry._id !== excludeEntryId &&
          entry.state.kind !== "rejected" &&
          entry.state.entryNumber !== undefined
        )
          held.add(entry.state.entryNumber);
      return held;
    },

    // Last competition's numbers stay with the people who had them until
    // entries close, whether or not they've started an entry yet
    async listReservedNumbers(competition: Doc<"competitions">) {
      const ownerByNumber = new Map<number, Id<"users">>();
      if (!competition.entriesOpen) return ownerByNumber;
      const [previousCompetition] = await competitions
        .query(context)
        .listBeforeYear(competition.year, 1);
      if (!previousCompetition) return ownerByNumber;
      for (const entry of await this.listApproved(previousCompetition._id))
        ownerByNumber.set(entry.state.entryNumber, entry.submittedByUserId);
      return ownerByNumber;
    },

    // The previous entry's number, unless another entry holds it or it's
    // reserved for whoever had it last year
    async findKeepableNumber(
      competitionId: Id<"competitions">,
      previousEntry: ApprovedEntryDoc,
      excludeEntryId?: Id<"entries">,
    ) {
      const { entryNumber } = previousEntry.state;
      const held = await this.listHeldNumbers(competitionId, excludeEntryId);
      if (held.has(entryNumber)) return null;
      const competition = await competitions
        .query(context)
        .forCompetition(competitionId)
        .get();
      const owner = (await this.listReservedNumbers(competition)).get(
        entryNumber,
      );
      if (owner !== undefined && owner !== previousEntry.submittedByUserId)
        return null;
      return entryNumber;
    },

    // A new entrant's number: random within the competition's range, never
    // one that's held or reserved
    async getNextAvailableEntryNumber(
      competitionId?: Id<"competitions">,
      excludeEntryId?: Id<"entries">,
    ) {
      const competition = competitionId
        ? await competitions.query(context).forCompetition(competitionId).get()
        : await competitions.query(context).current();
      const unavailable = await this.listHeldNumbers(
        competition._id,
        excludeEntryId,
      );
      for (const reserved of (
        await this.listReservedNumbers(competition)
      ).keys())
        unavailable.add(reserved);
      return pickEntryNumber(
        competitions.entryNumberRange(competition),
        unavailable,
      );
    },

    // This year's entry using the number, rejected ones aside
    async findHolderOfNumber(
      competitionId: Id<"competitions">,
      entryNumber: number,
      excludeEntryId?: Id<"entries">,
    ) {
      const withNumber = await db
        .query("entries")
        .withIndex("by_competitionId_and_entryNumber", (q) =>
          q
            .eq("competitionId", competitionId)
            .eq("state.entryNumber", entryNumber),
        )
        .take(10);
      return (
        withNumber.find(
          (entry) =>
            entry._id !== excludeEntryId && entry.state.kind !== "rejected",
        ) ?? null
      );
    },

    // The number on a house sign. Reserved numbers on entries that aren't
    // approved yet don't count.
    async findApprovedByNumber(
      competitionId: Id<"competitions">,
      entryNumber: number,
    ) {
      const withNumber = await db
        .query("entries")
        .withIndex("by_competitionId_and_entryNumber", (q) =>
          q
            .eq("competitionId", competitionId)
            .eq("state.entryNumber", entryNumber),
        )
        .take(10);
      return withNumber.find(isInState("approved")) ?? null;
    },

    async listApproved(competitionId?: Id<"competitions">) {
      const resolvedCompetitionId =
        competitionId ?? (await competitions.query(context).current())._id;
      // The index only returns approved entries
      return (await db
        .query("entries")
        .withIndex("by_competitionId_and_status", (q) =>
          q
            .eq("competitionId", resolvedCompetitionId)
            .eq("state.kind", "approved"),
        )
        .collect()) as ApprovedEntryDoc[];
    },

    async countApproved(competitionId: Id<"competitions">) {
      return (await this.listApproved(competitionId)).length;
    },

    async listInState(competitionId: Id<"competitions">, kind: EntryStateKind) {
      return await db
        .query("entries")
        .withIndex("by_competitionId_and_status", (q) =>
          q.eq("competitionId", competitionId).eq("state.kind", kind),
        )
        .collect();
    },

    async getStats(competitionId: Id<"competitions">) {
      const allEntries = await db
        .query("entries")
        .withIndex("by_competitionId_and_status", (q) =>
          q.eq("competitionId", competitionId),
        )
        .collect();
      return {
        totalEntries: allEntries.length,
        totalSubmittedEntries: allEntries.filter(isInState("submitted")).length,
        totalApprovedEntries: allEntries.filter(isInState("approved")).length,
        totalRejectedEntries: allEntries.filter(isInState("rejected")).length,
        // Started but not sent in for review yet
        totalUnsentEntries: allEntries.filter(isInState("draft", "submitting"))
          .length,
      };
    },

    async findEntriesByPlaceId(
      competitionId: Id<"competitions">,
      placeId: string,
    ) {
      return await db
        .query("entries")
        .withIndex("by_competitionId_and_homeAddress_placeId", (q) =>
          q
            .eq("competitionId", competitionId)
            .eq("state.houseAddress.placeId", placeId),
        )
        .take(100);
    },

    async hasEntryWithPlaceIdAlreadyBeenSubmitted(
      competitionId: Id<"competitions">,
      placeId: string,
      excludeEntryId?: Id<"entries">,
    ) {
      const matchedEntries = await this.findEntriesByPlaceId(
        competitionId,
        placeId,
      );

      const submitted = matchedEntries.filter((e) => {
        // Exclude the current entry if specified
        if (excludeEntryId && e._id === excludeEntryId) return false;

        return match(e.state.kind)
          .with("draft", () => false)
          .with("submitted", () => true)
          .with("approved", () => true)
          .with("rejected", () => false)
          .with("submitting", () => true)
          .exhaustive();
      });

      return submitted.length > 0;
    },
  };
}
