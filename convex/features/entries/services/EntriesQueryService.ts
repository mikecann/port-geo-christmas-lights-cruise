import { ensure } from "../../../../shared/ensure";
import { Id } from "../../../_generated/dataModel";
import { QueryCtx } from "../../../_generated/server";
import { EntryStatusKinds, EntryWithStatus } from "../schema";
import { QueryServices } from "../../services";
import { QueryService } from "../../lib";
import { isStatus } from "../../../../shared/filter";
import { match } from "ts-pattern";

export class EntriesQueryService extends QueryService {
  async find({ entryId }: { entryId: Id<"entries"> }) {
    return await this.context.db.get(entryId);
  }

  async get({ entryId }: { entryId: Id<"entries"> }) {
    const entry = await this.find({ entryId });
    return ensure(entry, `Entry with id '${entryId}' not found`);
  }

  async getWithStatus<T extends EntryStatusKinds>({
    entryId,
    status,
  }: {
    entryId: Id<"entries">;
    status: T;
  }): Promise<EntryWithStatus<T>> {
    const entry = await this.get({ entryId });

    if (entry.status !== status)
      throw new Error(
        `Entry with id '${entryId}' is expected to be in the '${status}' status, it is instead in the '${entry.status}' status`,
      );

    return entry as EntryWithStatus<T>;
  }

  async getApproved({ entryId }: { entryId: Id<"entries"> }) {
    return await this.getWithStatus({ entryId, status: "approved" });
  }

  async ensureEntryIsInStatus<T extends EntryStatusKinds>({
    entryId,
    status,
  }: {
    entryId: Id<"entries">;
    status: T;
  }) {
    await this.getWithStatus({ entryId, status });
  }

  ensureIsModifiable(entry: { status: EntryStatusKinds; _id: Id<"entries"> }) {
    if (entry.status !== "draft" && entry.status !== "approved")
      throw new Error(
        `Entry of id '${entry._id}' with status '${entry.status}' is not in draft or approved status and cannot be modified. Current status: ${entry.status}`,
      );
  }

  async listApproved() {
    const approved = await this.context.db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect()
      .then((a) => a.filter((e) => e.status == "approved"));

    return approved;
  }

  async countApproved() {
    const entries = await this.context.db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    return entries.length;
  }

  async listPendingReview() {
    return await this.context.db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();
  }

  async listRejected() {
    return await this.context.db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "rejected"))
      .collect();
  }

  async getStats() {
    const allEntries = await this.context.db.query("entries").collect();
    return {
      totalEntries: allEntries.length,
      totalSubmittedEntries: allEntries.filter(isStatus("submitted")).length,
      totalApprovedEntries: allEntries.filter(isStatus("approved")).length,
      totalRejectedEntries: allEntries.filter(isStatus("rejected")).length,
    };
  }

  async findEntriesByPlaceId(placeId: string) {
    return await this.context.db
      .query("entries")
      .withIndex("by_homeAddress_placeId", (q) =>
        q.eq("houseAddress.placeId", placeId),
      )
      .take(100);
  }

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
  }
}
