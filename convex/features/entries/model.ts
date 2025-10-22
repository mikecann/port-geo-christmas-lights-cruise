import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type {
  DatabaseReader,
  DatabaseWriter,
  MutationCtx,
  QueryCtx,
} from "../../_generated/server";
import { ensure } from "../../../shared/ensure";
import { match } from "ts-pattern";
import { photos } from "../photos/model";
import { isStatus } from "../../../shared/filter";
import { randomIntRange } from "../../../shared/num";
import * as testing from "./testing";

export const entries = {
  testing,

  forEntryDoc(entry: Doc<"entries">) {
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

  forEntry(entryId: Id<"entries">) {
    return {
      find(db: DatabaseReader) {
        return db.get(entryId);
      },

      async get(db: DatabaseReader) {
        const entry = await this.find(db);
        return ensure(entry, `Entry with id '${entryId}' not found`);
      },

      async getApproved(db: DatabaseReader) {
        const entry = await this.get(db);
        if (entry.status !== "approved")
          throw new Error("Entry is not approved");
        return entry;
      },

      async approve(
        db: DatabaseWriter,
        { entryNumber }: { entryNumber: number },
      ) {
        const entry = await this.get(db);

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

      async reject(db: DatabaseWriter) {
        const entry = await this.get(db);

        if (entry.status !== "submitted")
          throw new Error(
            `Entry '${entryId}' is not in submitted status and cannot be rejected. Current status: ${entry.status}`,
          );

        await db.patch(entryId, {
          status: "rejected",
          rejectedAt: Date.now(),
        });
      },

      async delete(ctx: MutationCtx) {
        await this.get(ctx.db);

        // Delete all photos for this entry
        await photos.forEntry(entryId).deleteAll(ctx);

        await ctx.db.delete(entryId);
      },

      async setEntryNumber(
        db: DatabaseWriter,
        { entryNumber }: { entryNumber: number },
      ) {
        await this.get(db); // Ensure entry exists
        await db.patch(entryId, { entryNumber });
      },
    };
  },

  forUser(userId: Id<"users">) {
    return {
      find(db: DatabaseReader) {
        return db
          .query("entries")
          .withIndex("by_submittedByUserId", (q) =>
            q.eq("submittedByUserId", userId),
          )
          .unique();
      },

      async get(db: DatabaseReader) {
        const entry = await this.find(db);
        return ensure(entry, `User '${userId}' has no entry`);
      },

      async getForModification(db: DatabaseReader) {
        const entry = await this.get(db);
        entries.forEntryDoc(entry).ensureIsModifiable();
        return entry;
      },

      async ensureIsModifiable(db: DatabaseReader) {
        const entry = await this.get(db);
        entries.forEntryDoc(entry).ensureIsModifiable();
      },

      async create(db: DatabaseWriter) {
        const existing = await this.find(db);
        if (existing)
          throw new Error(
            `Cannot enter competition, user '${userId}' already has an entry`,
          );

        return await db.insert("entries", {
          submittedByUserId: userId,
          status: "draft",
        });
      },

      async updateBeforeSubmission(
        db: DatabaseWriter,
        args: {
          houseAddress?: { address: string; placeId: string };
          name?: string;
        },
      ) {
        const entry = await this.get(db);

        if (entry.status != "draft")
          throw new Error(`Entry '${entry._id}' is not in the draft status`);

        const updateFields: {
          houseAddress?: { address: string; placeId: string };
          name?: string;
        } = {};
        if (args.houseAddress !== undefined)
          updateFields.houseAddress = args.houseAddress;

        if (args.name !== undefined) updateFields.name = args.name;

        await db.patch(entry._id, updateFields);
      },

      async updateApproved(db: DatabaseWriter, args: { name?: string }) {
        const entry = await this.get(db);

        if (entry.status !== "approved")
          throw new Error(`Entry '${entry._id}' is not in approved status`);

        const updateFields: {
          name?: string;
        } = {};
        if (args.name !== undefined) updateFields.name = args.name;

        await db.patch(entry._id, updateFields);
      },

      async remove(ctx: MutationCtx) {
        const entry = await this.get(ctx.db);

        if (entry.status != "draft")
          throw new Error(
            `Entry of id '${entry._id}' with status '${entry.status}' is not in the draft status`,
          );

        // Delete all photos for this entry
        await photos.forEntry(entry._id).deleteAll(ctx);

        await ctx.db.delete(entry._id);
      },

      async startSubmitting(ctx: MutationCtx) {
        const entry = await this.get(ctx.db);

        if (entry.status != "draft")
          throw new Error(`Entry '${entry._id}' is not in the draft status`);

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
          await entries.hasEntryWithPlaceIdAlreadyBeenSubmitted(ctx.db, placeId)
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

        return await this.get(ctx.db);
      },

      async finalizeSubmission(
        db: DatabaseWriter,
        args: {
          lat: number;
          lng: number;
          placeId: string;
        },
      ) {
        const entry = await this.get(db);

        if (entry.status != "submitting")
          throw new Error(
            `Entry '${entry._id}' is not in the submitting status`,
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
    };
  },

  async listApproved(db: DatabaseReader) {
    const approved = await db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect()
      .then((a) => a.filter((e) => e.status == "approved"));

    return approved;
  },

  async countApproved(db: DatabaseReader) {
    const entries = await db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    return entries.length;
  },

  async listPendingReview(db: DatabaseReader) {
    return await db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
  },

  async listRejected(db: DatabaseReader) {
    return await db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "rejected"))
      .collect();
  },

  async getStats(db: DatabaseReader) {
    const allEntries = await db.query("entries").collect();
    return {
      totalEntries: allEntries.length,
      totalSubmittedEntries: allEntries.filter(isStatus("submitted")).length,
      totalApprovedEntries: allEntries.filter(isStatus("approved")).length,
      totalRejectedEntries: allEntries.filter(isStatus("rejected")).length,
    };
  },

  async wipeAll(ctx: MutationCtx) {
    const allEntries = await ctx.db.query("entries").collect();
    let deletedCount = 0;
    for (const entry of allEntries) {
      // Use the proper delete method to clean up photos
      await entries.forEntry(entry._id).delete(ctx);
      deletedCount++;
    }
    return { deletedCount };
  },

  async getNextAvailableEntryNumber(db: DatabaseReader) {
    const approvedEntries = await this.listApproved(db);
    if (approvedEntries.length === 0) return randomIntRange(0, 50);

    const usedNumbers = new Set(
      approvedEntries.map((entry) => entry.entryNumber),
    );

    const availableNumbers = [];
    for (let i = 0; i <= 50; i++)
      if (!usedNumbers.has(i)) availableNumbers.push(i);

    if (availableNumbers.length > 0) {
      const randomIndex = randomIntRange(0, availableNumbers.length - 1);
      return availableNumbers[randomIndex];
    }

    return Math.max(...usedNumbers) + 1;
  },

  async findEntriesByPlaceId(db: DatabaseReader, placeId: string) {
    return await db
      .query("entries")
      .withIndex("by_homeAddress_placeId", (q) =>
        q.eq("houseAddress.placeId", placeId),
      )
      .take(100);
  },

  async hasEntryWithPlaceIdAlreadyBeenSubmitted(
    db: DatabaseReader,
    placeId: string,
  ) {
    const matchedEntries = await this.findEntriesByPlaceId(db, placeId);

    const submitted = matchedEntries.filter((e) =>
      match(e)
        .with({ status: "draft" }, () => false)
        .with({ status: "submitted" }, () => true)
        .with({ status: "approved" }, () => true)
        .with({ status: "rejected" }, () => false)
        .with({ status: "submitting" }, () => false)
        .exhaustive(),
    );

    return submitted.length > 0;
  },
};
