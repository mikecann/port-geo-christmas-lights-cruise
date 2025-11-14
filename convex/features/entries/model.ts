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

          async approve({ entryNumber }: { entryNumber: number }) {
            const entry = await this.get();

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

          async reject(
            db: DatabaseWriter,
            { rejectedReason }: { rejectedReason: string },
          ) {
            const entry = await this.get(db);

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
        };
      },

      forUser(userId: Id<"users">) {
        return {
          find() {
            return db
              .query("entries")
              .withIndex("by_submittedByUserId", (q) =>
                q.eq("submittedByUserId", userId),
              )
              .unique();
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

      async listApproved() {
        const approved = await db
          .query("entries")
          .withIndex("by_status", (q) => q.eq("status", "approved"))
          .collect()
          .then((a) => a.filter((e) => e.status == "approved"));

        return approved;
      },

      async countApproved() {
        const entries = await db
          .query("entries")
          .withIndex("by_status", (q) => q.eq("status", "approved"))
          .collect();

        return entries.length;
      },

      async listPendingReview() {
        return await db
          .query("entries")
          .withIndex("by_status", (q) => q.eq("status", "submitted"))
          .collect();
      },

      async listRejected() {
        return await db
          .query("entries")
          .withIndex("by_status", (q) => q.eq("status", "rejected"))
          .collect();
      },

      async getStats() {
        const allEntries = await db.query("entries").collect();
        return {
          totalEntries: allEntries.length,
          totalSubmittedEntries: allEntries.filter(isStatus("submitted"))
            .length,
          totalApprovedEntries: allEntries.filter(isStatus("approved")).length,
          totalRejectedEntries: allEntries.filter(isStatus("rejected")).length,
        };
      },

      async findEntriesByPlaceId(placeId: string) {
        return await db
          .query("entries")
          .withIndex("by_homeAddress_placeId", (q) =>
            q.eq("houseAddress.placeId", placeId),
          )
          .take(100);
      },

      async hasEntryWithPlaceIdAlreadyBeenSubmitted(
        placeId: string,
        excludeEntryId?: Id<"entries">,
      ) {
        const matchedEntries = await this.findEntriesByPlaceId(placeId);

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

      forUser(userId: Id<"users">) {
        const query = entries.query(context).forUser(userId);
        return {
          async create() {
            const existing = await query.find();
            if (existing)
              throw new Error(
                `Cannot enter competition, user '${userId}' already has an entry`,
              );

            return await db.insert("entries", {
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
                .hasEntryWithPlaceIdAlreadyBeenSubmitted(placeId)
            )
              throw new ConvexError(
                `Address ${entry.houseAddress.address} is already used!`,
              );

            await ctx.db.patch(entry._id, {
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
              throw new Error(
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

      async wipeAll() {
        const allEntries = await context.db.query("entries").collect();
        let deletedCount = 0;
        for (const entry of allEntries) {
          // Use the proper delete method to clean up photos
          await entries.mutate(context).forEntry(entry._id).delete();
          deletedCount++;
        }
        return { deletedCount };
      },

      async getNextAvailableEntryNumber() {
        const approvedEntries = await query.listApproved();
        if (approvedEntries.length === 0)
          return randomIntRange(0, MAX_ENTRY_NUMBER);

        const usedNumbers = new Set(
          approvedEntries.map((entry) => entry.entryNumber),
        );

        const availableNumbers = [];
        for (let i = 0; i <= MAX_ENTRY_NUMBER; i++)
          if (!usedNumbers.has(i)) availableNumbers.push(i);

        if (availableNumbers.length > 0) {
          const randomIndex = randomIntRange(0, availableNumbers.length - 1);
          return availableNumbers[randomIndex];
        }

        return Math.max(...usedNumbers) + 1;
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
