import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { type MutationCtx, type QueryCtx } from "../../_generated/server";
import { ensure } from "../../../shared/ensure";
import { match } from "ts-pattern";
import { photos } from "../photos/model";
import { votes } from "../votes/model";
import { isStatus } from "../../../shared/filter";
import { isWithinBoundary } from "../../../shared/geo";
import {
  MAX_ENTRY_ADDRESS_LENGTH,
  MAX_ENTRY_NAME_LENGTH,
  MAX_REJECTED_REASON_LENGTH,
} from "../../../shared/constants";
import { competitions } from "../competitions/model";
import type { ApprovedEntryDoc, EntryStatusKinds, PublicEntry } from "./schema";
import { ensureValidEntryNumber, pickEntryNumber } from "./numbers";

function trimToLimit(value: string, maxLength: number, label: string) {
  const trimmed = value.trim();
  if (trimmed.length > maxLength)
    throw new ConvexError(`${label} must be ${maxLength} characters or fewer.`);
  return trimmed;
}

export const ENTRY_UNAVAILABLE_MESSAGE =
  "Sorry, that entry isn't available. It may have been removed from the competition.";

export const entries = {
  toPublic(entry: ApprovedEntryDoc): PublicEntry {
    const { address, lat, lng } = entry.houseAddress;
    return {
      _id: entry._id,
      competitionId: entry.competitionId,
      name: entry.name,
      entryNumber: entry.entryNumber,
      houseAddress: { address, lat, lng },
    };
  },

  doc(entry: Doc<"entries">) {
    return {
      ensureIsModifiable() {
        if (entry.status !== "draft" && entry.status !== "approved")
          throw new ConvexError(
            "Your entry can only be changed while it's a draft or once it's been approved.",
          );
        return entry;
      },
    };
  },

  query(context: QueryCtx) {
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
            return entry?.status === "approved" ? entry : null;
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
            entries.doc(entry).ensureIsModifiable();
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
              if (entry?.status === "approved") return entry;
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
        const previous = await db.get(entry.previousEntryId);
        return previous?.status === "approved" ? previous : null;
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
            entry.status !== "rejected" &&
            entry.entryNumber !== undefined
          )
            held.add(entry.entryNumber);
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
          ownerByNumber.set(entry.entryNumber, entry.submittedByUserId);
        return ownerByNumber;
      },

      // The previous entry's number, unless another entry holds it or it's
      // reserved for whoever had it last year
      async findKeepableNumber(
        competitionId: Id<"competitions">,
        previousEntry: ApprovedEntryDoc,
        excludeEntryId?: Id<"entries">,
      ) {
        const { entryNumber } = previousEntry;
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

      // This year's entry using the number, rejected ones aside
      async findHolderOfNumber(
        competitionId: Id<"competitions">,
        entryNumber: number,
        excludeEntryId?: Id<"entries">,
      ) {
        const withNumber = await db
          .query("entries")
          .withIndex("by_competitionId_and_entryNumber", (q) =>
            q.eq("competitionId", competitionId).eq("entryNumber", entryNumber),
          )
          .take(10);
        return (
          withNumber.find(
            (entry) =>
              entry._id !== excludeEntryId && entry.status !== "rejected",
          ) ?? null
        );
      },

      async ensureNumberIsFree(
        competitionId: Id<"competitions">,
        entryNumber: number,
        entryId: Id<"entries">,
      ) {
        const held = await this.listHeldNumbers(competitionId, entryId);
        if (held.has(entryNumber))
          throw new ConvexError(
            `Number ${entryNumber} is already used by another entry this year.`,
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
            q.eq("competitionId", competitionId).eq("entryNumber", entryNumber),
          )
          .take(10);
        return (
          withNumber.find(
            (entry): entry is ApprovedEntryDoc => entry.status === "approved",
          ) ?? null
        );
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
              .eq("status", "approved"),
          )
          .collect()) as ApprovedEntryDoc[];
      },

      async countApproved(competitionId: Id<"competitions">) {
        return (await this.listApproved(competitionId)).length;
      },

      async listWithStatus(
        competitionId: Id<"competitions">,
        status: EntryStatusKinds,
      ) {
        return await db
          .query("entries")
          .withIndex("by_competitionId_and_status", (q) =>
            q.eq("competitionId", competitionId).eq("status", status),
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
          totalSubmittedEntries: allEntries.filter(isStatus("submitted"))
            .length,
          totalApprovedEntries: allEntries.filter(isStatus("approved")).length,
          totalRejectedEntries: allEntries.filter(isStatus("rejected")).length,
          // Started but not sent in for review yet
          totalUnsentEntries: allEntries.filter(
            (entry) =>
              entry.status === "draft" || entry.status === "submitting",
          ).length,
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
              .eq("houseAddress.placeId", placeId),
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

          return match(e)
            .with({ status: "draft" }, () => false)
            .with({ status: "submitted" }, () => true)
            .with({ status: "approved" }, () => true)
            .with({ status: "rejected" }, () => false)
            .with({ status: "submitting" }, () => true)
            .exhaustive();
        });

        return submitted.length > 0;
      },
    };
  },

  mutate(context: MutationCtx) {
    const { db } = context;
    const query = entries.query(context);

    // A number they couldn't keep when they started may have been freed since
    const findNumberToKeep = async (entry: Doc<"entries">) => {
      const previous = await query.findPreviousOf(entry);
      if (!previous) return null;
      return await query.findKeepableNumber(
        entry.competitionId,
        previous,
        entry._id,
      );
    };

    return {
      forEntry(entryId: Id<"entries">) {
        const query = entries.query(context).forEntry(entryId);
        return {
          // Keeps a returning entrant's reserved number, otherwise gives the
          // entry a new one. Returns the number.
          async approve() {
            const entry = await query.get();

            if (entry.status !== "submitted")
              throw new Error(
                `Entry '${entryId}' is not in submitted status and cannot be approved. Current status: ${entry.status}`,
              );

            const entryNumber =
              entry.entryNumber ??
              (await findNumberToKeep(entry)) ??
              (await entries
                .mutate(context)
                .getNextAvailableEntryNumber(entry.competitionId, entryId));

            await db.patch(entryId, {
              status: "approved",
              approvedAt: Date.now(),
              entryNumber,
            });
            return entryNumber;
          },

          async reject({ rejectedReason }: { rejectedReason: string }) {
            const entry = await query.get();

            if (entry.status !== "submitted")
              throw new Error(
                `Entry '${entryId}' is not in submitted status and cannot be rejected. Current status: ${entry.status}`,
              );

            await db.patch(entryId, {
              status: "rejected",
              rejectedAt: Date.now(),
              rejectedReason: trimToLimit(
                rejectedReason,
                MAX_REJECTED_REASON_LENGTH,
                "The rejection reason",
              ),
            });
          },

          // Undoes a rejection, so it's back in the review queue. Its old
          // number may have gone to someone else, so approval picks again.
          async reopen() {
            const entry = await query.get();
            if (entry.status !== "rejected")
              throw new ConvexError(
                "Only rejected entries can be sent back for review.",
              );
            await db.replace(entryId, {
              competitionId: entry.competitionId,
              submittedByUserId: entry.submittedByUserId,
              ...(entry.previousEntryId === undefined
                ? {}
                : { previousEntryId: entry.previousEntryId }),
              status: "submitted",
              submittedAt: entry.submittedAt,
              houseAddress: entry.houseAddress,
              name: entry.name,
            });
          },

          async delete() {
            await query.get();
            await photos.forEntry(entryId).deleteAll(context);
            await votes.forEntry(entryId).deleteAll(context.db);
            await context.db.delete(entryId);
          },

          async setEntryNumber({ entryNumber }: { entryNumber: number }) {
            await query.get();
            await db.patch(entryId, { entryNumber });
          },

          // For admins, so the number must be free in the competition
          async overrideEntryNumber(entryNumber: number) {
            const entry = await query.get();
            if (entry.status === "rejected")
              throw new ConvexError("Rejected entries don't have a number.");
            ensureValidEntryNumber(entryNumber);
            await entries
              .query(context)
              .ensureNumberIsFree(entry.competitionId, entryNumber, entryId);
            await db.patch(entryId, { entryNumber });
          },

          // For someone who signed in with a different account this year. The
          // entry takes the previous entry's number.
          async linkPreviousEntry(previousEntryId: Id<"entries">) {
            const entry = await query.get();
            if (entry.status === "rejected")
              throw new ConvexError(
                "Rejected entries can't be linked to a previous entry.",
              );
            const previous = await entries
              .query(context)
              .forEntry(previousEntryId)
              .findApproved();
            const yearOf = async (id: Id<"competitions">) =>
              (await competitions.query(context).forCompetition(id).get()).year;
            if (
              !previous ||
              (await yearOf(previous.competitionId)) >=
                (await yearOf(entry.competitionId))
            )
              throw new ConvexError(
                "Only an approved entry from an earlier year can be linked.",
              );
            await entries
              .query(context)
              .ensureNumberIsFree(
                entry.competitionId,
                previous.entryNumber,
                entryId,
              );
            await db.patch(entryId, {
              previousEntryId,
              entryNumber: previous.entryNumber,
            });
          },
        };
      },

      forUser(competitionId: Id<"competitions">, userId: Id<"users">) {
        const query = entries.query(context).forUser(competitionId, userId);
        return {
          async create() {
            const existing = await query.find();
            if (existing)
              throw new ConvexError(
                "You've already entered this year's competition.",
              );

            const previousEntry = await query.findPreviousApproved();
            if (!previousEntry)
              return await db.insert("entries", {
                competitionId,
                submittedByUserId: userId,
                status: "draft",
              });

            // Returning entrants start from last time's name and address and
            // keep their number. Photos aren't copied: they show this year's
            // display.
            const entryNumber = await entries
              .query(context)
              .findKeepableNumber(competitionId, previousEntry);
            return await db.insert("entries", {
              competitionId,
              submittedByUserId: userId,
              status: "draft",
              previousEntryId: previousEntry._id,
              name: previousEntry.name,
              houseAddress: {
                address: previousEntry.houseAddress.address,
                placeId: previousEntry.houseAddress.placeId,
              },
              ...(entryNumber === null ? {} : { entryNumber }),
            });
          },

          async updateBeforeSubmission(args: {
            houseAddress?: { address: string; placeId: string };
            name?: string;
          }) {
            const entry = await query.get();

            if (entry.status != "draft")
              throw new ConvexError(
                "Your entry has already been submitted, so it can't be changed here.",
              );

            const updateFields: {
              houseAddress?: { address: string; placeId: string };
              name?: string;
            } = {};
            if (args.houseAddress !== undefined)
              updateFields.houseAddress = {
                address: trimToLimit(
                  args.houseAddress.address,
                  MAX_ENTRY_ADDRESS_LENGTH,
                  "The address",
                ),
                placeId: args.houseAddress.placeId,
              };

            if (args.name !== undefined)
              updateFields.name = trimToLimit(
                args.name,
                MAX_ENTRY_NAME_LENGTH,
                "The entry name",
              );

            await db.patch(entry._id, updateFields);
          },

          async updateApproved(args: { name?: string }) {
            const entry = await query.get();

            if (entry.status !== "approved")
              throw new ConvexError(
                "Your entry can only be renamed once it's been approved.",
              );

            const updateFields: {
              name?: string;
            } = {};
            if (args.name !== undefined)
              updateFields.name = trimToLimit(
                args.name,
                MAX_ENTRY_NAME_LENGTH,
                "The entry name",
              );

            await db.patch(entry._id, updateFields);
          },

          async remove() {
            const entry = await query.get();

            if (entry.status != "draft")
              throw new ConvexError(
                "Your entry can only be deleted while it's a draft.",
              );

            await entries.mutate(context).forEntry(entry._id).delete();
          },

          async startSubmitting() {
            const entry = await query.get();

            if (entry.status != "draft")
              throw new ConvexError("Your entry has already been submitted.");

            const { houseAddress, name } = entry;
            if (!houseAddress?.address.trim() || !houseAddress.placeId.trim())
              throw new ConvexError(
                "Please choose your house address from the suggestions before submitting.",
              );
            if (!name?.trim())
              throw new ConvexError(
                "Please give your entry a name before submitting.",
              );

            if (
              await entries
                .query(context)
                .hasEntryWithPlaceIdAlreadyBeenSubmitted(
                  competitionId,
                  houseAddress.placeId,
                )
            )
              throw new ConvexError(
                `Address ${houseAddress.address} is already used!`,
              );

            await db.patch(entry._id, {
              status: "submitting" as const,
              name,
              houseAddress,
            });

            return await query.get();
          },

          async finalizeSubmission(args: {
            lat: number;
            lng: number;
            placeId: string;
          }) {
            const entry = await query.get();

            if (entry.status != "submitting")
              throw new Error(
                `Entry '${entry._id}' is not in the submitting status`,
              );

            if (
              await entries
                .query(context)
                .hasEntryWithPlaceIdAlreadyBeenSubmitted(
                  competitionId,
                  args.placeId,
                  entry._id,
                )
            )
              throw new ConvexError(
                `Address ${entry.houseAddress.address} is already used!`,
              );

            if (!isWithinBoundary({ lat: args.lat, lng: args.lng }))
              throw new ConvexError(
                `Address "${entry.houseAddress.address}" is outside the competition area. Entries must be within the Port Geographe/Busselton region.`,
              );

            await db.patch(entry._id, {
              status: "submitted" as const,
              submittedAt: Date.now(),
              houseAddress: {
                address: entry.houseAddress.address,
                lat: args.lat,
                lng: args.lng,
                placeId: args.placeId,
              },
            });
          },

          async revertToDraft() {
            const entry = await query.get();

            if (entry.status !== "submitting")
              throw new Error(
                `Entry '${entry._id}' is not in submitting status, cannot revert`,
              );

            await db.patch(entry._id, { status: "draft" as const });
          },
        };
      },

      // Only ever the current competition, so past seasons can't be wiped
      async wipeCurrentCompetition() {
        const competition = await competitions.query(context).current();
        const allEntries = await context.db
          .query("entries")
          .withIndex("by_competitionId_and_status", (q) =>
            q.eq("competitionId", competition._id),
          )
          .collect();
        let deletedCount = 0;
        for (const entry of allEntries) {
          // Use the proper delete method to clean up photos
          await entries.mutate(context).forEntry(entry._id).delete();
          deletedCount++;
        }
        return { deletedCount };
      },

      // A new entrant's number: random within the competition's range, never
      // one that's held or reserved
      async getNextAvailableEntryNumber(
        competitionId?: Id<"competitions">,
        excludeEntryId?: Id<"entries">,
      ) {
        const competition = competitionId
          ? await competitions
              .query(context)
              .forCompetition(competitionId)
              .get()
          : await competitions.query(context).current();
        const unavailable = await query.listHeldNumbers(
          competition._id,
          excludeEntryId,
        );
        for (const reserved of (
          await query.listReservedNumbers(competition)
        ).keys())
          unavailable.add(reserved);
        return pickEntryNumber(
          competitions.entryNumberRange(competition),
          unavailable,
        );
      },
    };
  },
};
