import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { type MutationCtx, type QueryCtx } from "../../_generated/server";
import { ensure } from "../../../shared/ensure";
import { match } from "ts-pattern";
import { photos } from "../photos/model";
import { isStatus } from "../../../shared/filter";
import { randomIntRange } from "../../../shared/num";
import * as testing from "./testing";
import { exhaustiveCheck } from "../../../shared/misc";
import {
  COMPETITION_GEOGRAPHIC_BOUNDARY,
  MAX_ENTRY_NUMBER,
  usersWhiteList,
} from "../../../shared/constants";
import { competitions } from "../competitions/model";

export const entries = {
  testing,

  doc(entry: Doc<"entries">) {
    return {
      ensureIsModifiable() {
        if (entry.status !== "draft" && entry.status !== "approved")
          throw new Error(
            `Entry of id '${entry._id}' with status '${entry.status}' is not in draft or approved status and cannot be modified. Current status: ${entry.status}`,
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

      forUser(
        competitionIdOrUserId: Id<"competitions"> | Id<"users">,
        maybeUserId?: Id<"users">,
      ) {
        const userId = maybeUserId ?? (competitionIdOrUserId as Id<"users">);
        const resolveCompetitionId = async () =>
          maybeUserId
            ? (competitionIdOrUserId as Id<"competitions">)
            : (await competitions.query(context).current())._id;
        return {
          async find() {
            const competitionId = await resolveCompetitionId();
            return db
              .query("entries")
              .withIndex("by_competitionId_and_submittedByUserId", (q) =>
                q
                  .eq("competitionId", competitionId)
                  .eq("submittedByUserId", userId),
              )
              .unique();
          },

          async listAcrossCompetitions() {
            const competitionDocs = await competitions
              .query(context)
              .listNewestFirst();
            const rows = await Promise.all(
              competitionDocs.map(async (competition) => ({
                competition,
                entry: await db
                  .query("entries")
                  .withIndex("by_competitionId_and_submittedByUserId", (q) =>
                    q
                      .eq("competitionId", competition._id)
                      .eq("submittedByUserId", userId),
                  )
                  .unique(),
              })),
            );
            return rows.filter(
              (row): row is typeof row & { entry: Doc<"entries"> } =>
                row.entry !== null,
            );
          },

          async findMostRecentPreviousApproved(
            competitionId: Id<"competitions">,
          ) {
            const competition = await competitions
              .query(context)
              .forCompetition(competitionId)
              .get();
            const previousCompetitions = await competitions
              .query(context)
              .listBeforeYear(competition.year);

            for (const previousCompetition of previousCompetitions) {
              const previousEntry = await db
                .query("entries")
                .withIndex("by_competitionId_and_submittedByUserId", (q) =>
                  q
                    .eq("competitionId", previousCompetition._id)
                    .eq("submittedByUserId", userId),
                )
                .unique();
              if (previousEntry?.status === "approved") return previousEntry;
            }

            return null;
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

          async ensureIsModifiable() {
            const entry = await this.get();
            entries.doc(entry).ensureIsModifiable();
          },
        };
      },

      async listApproved(competitionId?: Id<"competitions">) {
        const resolvedCompetitionId =
          competitionId ?? (await competitions.query(context).current())._id;
        const approved = await db
          .query("entries")
          .withIndex("by_competitionId_and_status", (q) =>
            q
              .eq("competitionId", resolvedCompetitionId)
              .eq("status", "approved"),
          )
          .collect()
          .then((a) => a.filter((e) => e.status == "approved"));

        return approved;
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
              rejectedReason,
            });
          },

          async delete() {
            const entry = await query.get();

            // Delete all photos for this entry
            await photos.forEntry(entryId).deleteAll(context);

            await context.db.delete(entryId);
          },

          async setEntryNumber({ entryNumber }: { entryNumber: number }) {
            const entry = await query.get();
            await db.patch(entryId, { entryNumber });
          },
        };
      },

      forUser(
        competitionIdOrUserId: Id<"competitions"> | Id<"users">,
        maybeUserId?: Id<"users">,
      ) {
        const userId = maybeUserId ?? (competitionIdOrUserId as Id<"users">);
        const resolveCompetitionId = async () =>
          maybeUserId
            ? (competitionIdOrUserId as Id<"competitions">)
            : (await competitions.query(context).current())._id;
        const query = entries
          .query(context)
          .forUser(competitionIdOrUserId, maybeUserId);
        return {
          async create() {
            const competitionId = await resolveCompetitionId();
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
              updateFields.houseAddress = args.houseAddress;

            if (args.name !== undefined) updateFields.name = args.name;

            await db.patch(entry._id, updateFields);
          },

          async updateApproved(args: { name?: string }) {
            const entry = await query.get();

            if (entry.status !== "approved")
              throw new Error(`Entry '${entry._id}' is not in approved status`);

            const updateFields: {
              name?: string;
            } = {};
            if (args.name !== undefined) updateFields.name = args.name;

            await db.patch(entry._id, updateFields);
          },

          async remove(ctx: MutationCtx) {
            const entry = await query.get();

            if (entry.status != "draft")
              throw new Error(
                `Entry of id '${entry._id}' with status '${entry.status}' is not in the draft status`,
              );

            // Delete all photos for this entry
            await photos.forEntry(entry._id).deleteAll(ctx);

            await ctx.db.delete(entry._id);
          },

          async startSubmitting(ctx: MutationCtx) {
            const competitionId = await resolveCompetitionId();
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
            if (
              typeof address !== "string" ||
              address.trim().length === 0 ||
              typeof placeId !== "string" ||
              placeId.trim().length === 0
            )
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
            const competitionId = await resolveCompetitionId();
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
              throw new Error(
                `Cannot finalize submission: Place ID '${args.placeId}' already has an approved entry`,
              );

            if (
              !entries.isLocationWithinCompetitionBoundary(args.lat, args.lng)
            )
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

            // Revert back to draft, preserving the address data as optional draft format
            const draftAddress =
              typeof entry.houseAddress === "object" &&
              "address" in entry.houseAddress &&
              "placeId" in entry.houseAddress
                ? {
                    address: entry.houseAddress.address,
                    placeId: entry.houseAddress.placeId,
                  }
                : undefined;

            await db.patch(entry._id, {
              status: "draft" as const,
              houseAddress: draftAddress,
            });
          },
        };
      },

      async wipeAll(competitionId?: Id<"competitions">) {
        const allEntries = competitionId
          ? await context.db
              .query("entries")
              .withIndex("by_competitionId_and_status", (q) =>
                q.eq("competitionId", competitionId),
              )
              .collect()
          : await context.db.query("entries").collect();
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
            .forUser(userId)
            .findMostRecentPreviousApproved(resolvedCompetitionId);
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

  /**
   * Checks if the given latitude and longitude coordinates are within
   * the allowed geographic boundary for competition entries.
   * @param lat - Latitude coordinate
   * @param lng - Longitude coordinate
   * @returns true if coordinates are within the boundary, false otherwise
   */
  isLocationWithinCompetitionBoundary(lat: number, lng: number): boolean {
    const { southWest, northEast } = COMPETITION_GEOGRAPHIC_BOUNDARY;

    return (
      lat >= southWest.lat &&
      lat <= northEast.lat &&
      lng >= southWest.lng &&
      lng <= northEast.lng
    );
  },

  /**
   * Checks if a user's email is on the whitelist.
   * Comparison is case-insensitive.
   * @param email - User's email address
   * @returns true if email is on the whitelist, false otherwise
   */
  isUserEmailOnWhitelist(email: string | undefined): boolean {
    if (!email) return false;
    const emailLower = email.toLowerCase().trim();
    return usersWhiteList.some(
      (user) => user.email.toLowerCase().trim() === emailLower,
    );
  },
};
