import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { type MutationCtx, type QueryCtx } from "../../_generated/server";
import { ensure } from "../../../shared/ensure";
import { match } from "ts-pattern";
import { photos } from "../photos/model";
import { votes } from "../votes/model";
import { isStatus } from "../../../shared/filter";
import { randomIntRange } from "../../../shared/num";
import { exhaustiveCheck } from "../../../shared/misc";
import { isWithinBoundary } from "../../../shared/geo";
import {
  MAX_ENTRY_ADDRESS_LENGTH,
  MAX_ENTRY_NAME_LENGTH,
  MAX_ENTRY_NUMBER,
  MAX_REJECTED_REASON_LENGTH,
} from "../../../shared/constants";
import { competitions } from "../competitions/model";
import type { ApprovedEntryDoc, PublicEntry } from "./schema";

function trimToLimit(value: string, maxLength: number, label: string) {
  const trimmed = value.trim();
  if (trimmed.length > maxLength)
    throw new ConvexError(`${label} must be ${maxLength} characters or fewer.`);
  return trimmed;
}

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
    const { auth, db, storage } = context;
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

          async getApproved() {
            const entry = await this.get();
            if (entry.status !== "approved")
              throw new Error("Entry is not approved");
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
            return ensure(entry, `User '${userId}' has no entry`);
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

          async findPreviousApproved() {
            const [previousCompetition] = await listEarlierCompetitions(1);
            if (!previousCompetition) return null;
            const previousEntry = await findInCompetition(
              previousCompetition._id,
            );
            return previousEntry?.status === "approved" ? previousEntry : null;
          },

          async hasApprovedEntryBefore() {
            for (const earlier of await listEarlierCompetitions()) {
              const entry = await findInCompetition(earlier._id);
              if (entry?.status === "approved") return true;
            }
            return false;
          },
        };
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

      async listPendingReview(competitionId: Id<"competitions">) {
        return await db
          .query("entries")
          .withIndex("by_competitionId_and_status", (q) =>
            q.eq("competitionId", competitionId).eq("status", "submitted"),
          )
          .collect();
      },

      async listRejected(competitionId: Id<"competitions">) {
        return await db
          .query("entries")
          .withIndex("by_competitionId_and_status", (q) =>
            q.eq("competitionId", competitionId).eq("status", "rejected"),
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
    const { auth, db, storage } = context;
    const query = entries.query(context);
    return {
      forEntry(entryId: Id<"entries">) {
        const query = entries.query(context).forEntry(entryId);
        return {
          async approve({ entryNumber }: { entryNumber: number }) {
            const entry = await query.get();

            if (entry.status !== "submitted")
              throw new Error(
                `Entry '${entryId}' is not in submitted status and cannot be approved. Current status: ${entry.status}`,
              );

            await db.patch(entryId, {
              status: "approved",
              approvedAt: Date.now(),
              entryNumber,
            });
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

          async delete() {
            await query.get();
            await photos.forEntry(entryId).deleteAll(context);
            await votes.forEntry(entryId).deleteAll(context.db);
            await context.db.delete(entryId);
          },

          async setEntryNumber({ entryNumber }: { entryNumber: number }) {
            const entry = await query.get();
            await db.patch(entryId, { entryNumber });
          },
        };
      },

      forUser(competitionId: Id<"competitions">, userId: Id<"users">) {
        const query = entries.query(context).forUser(competitionId, userId);
        return {
          async create() {
            const existing = await query.find();
            if (existing)
              throw new Error(
                `Cannot enter competition, user '${userId}' already has an entry`,
              );

            return await db.insert("entries", {
              competitionId,
              submittedByUserId: userId,
              status: "draft",
            });
          },

          async updateBeforeSubmission(args: {
            houseAddress?: { address: string; placeId: string };
            name?: string;
          }) {
            const entry = await query.get();

            if (entry.status != "draft")
              throw new Error(
                `Entry '${entry._id}' is not in the draft status`,
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
              throw new Error(`Entry '${entry._id}' is not in approved status`);

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
              throw new Error(
                `Entry of id '${entry._id}' with status '${entry.status}' is not in the draft status`,
              );

            await entries.mutate(context).forEntry(entry._id).delete();
          },

          async startSubmitting() {
            const entry = await query.get();

            if (entry.status != "draft")
              throw new Error(
                `Entry '${entry._id}' is not in the draft status`,
              );

            if (!entry.houseAddress)
              throw new Error(
                `Entry '${entry._id}' is missing required house address`,
              );

            const { address, placeId } = entry.houseAddress;
            if (address.trim().length === 0 || placeId.trim().length === 0)
              throw new Error(
                `Invalid house address: address '${address}' and placeId '${placeId}' must be provided`,
              );

            if (
              await entries
                .query(context)
                .hasEntryWithPlaceIdAlreadyBeenSubmitted(competitionId, placeId)
            )
              throw new ConvexError(
                `Address ${entry.houseAddress.address} is already used!`,
              );

            await db.patch(entry._id, {
              status: "submitting" as const,
              name: ensure(
                entry.name,
                `Entry '${entry._id}' is missing required name`,
              ),
              houseAddress: entry.houseAddress,
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

      async getNextAvailableEntryNumber(
        competitionId?: Id<"competitions">,
        userId?: Id<"users">,
      ) {
        const resolvedCompetitionId =
          competitionId ?? (await competitions.query(context).current())._id;
        const approvedEntries = await query.listApproved(resolvedCompetitionId);
        const usedNumbers = new Set(
          approvedEntries.map((entry) => entry.entryNumber),
        );
        const unavailableNumbers = new Set(usedNumbers);

        if (userId) {
          const previousEntry = await entries
            .query(context)
            .forUser(resolvedCompetitionId, userId)
            .findPreviousApproved();
          if (previousEntry && !usedNumbers.has(previousEntry.entryNumber))
            return previousEntry.entryNumber;

          // Keep last season's numbers available for their returning owners.
          // New entrants can use unreserved numbers or continue above the old pool.
          const currentCompetition = await competitions
            .query(context)
            .forCompetition(resolvedCompetitionId)
            .get();
          const [previousCompetition] = await competitions
            .query(context)
            .listBeforeYear(currentCompetition.year, 1);
          if (previousCompetition) {
            const previousEntries = await query.listApproved(
              previousCompetition._id,
            );
            for (const previousEntry of previousEntries)
              unavailableNumbers.add(previousEntry.entryNumber);
          }
        }

        if (unavailableNumbers.size === 0)
          return randomIntRange(0, MAX_ENTRY_NUMBER);

        const availableNumbers = [];
        for (let i = 0; i <= MAX_ENTRY_NUMBER; i++)
          if (!unavailableNumbers.has(i)) availableNumbers.push(i);

        if (availableNumbers.length > 0) {
          const randomIndex = randomIntRange(0, availableNumbers.length - 1);
          return availableNumbers[randomIndex];
        }

        return Math.max(...unavailableNumbers) + 1;
      },
    };
  },
};
