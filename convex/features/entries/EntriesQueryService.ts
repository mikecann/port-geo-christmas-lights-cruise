import { ensure } from "../../../shared/ensure";
import { Id } from "../../_generated/dataModel";
import { QueryCtx } from "../../_generated/server";
import { EntryStatusKinds, EntryWithStatus } from "./schema";
import { QueryServices } from "../services";
import { QueryService } from "../lib";

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
}
