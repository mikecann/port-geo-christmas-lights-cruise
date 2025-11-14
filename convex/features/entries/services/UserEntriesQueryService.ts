import { ensure } from "../../../../shared/ensure";
import { UserQueryService } from "../../lib";
import { EntryStatusKinds } from "../schema";
import { Id } from "../../../_generated/dataModel";

export class UserEntriesQueryService extends UserQueryService {
  async find() {
    return await this.context.db
      .query("entries")
      .withIndex("by_submittedByUserId", (q) =>
        q.eq("submittedByUserId", this.userId),
      )
      .unique();
  }

  async get() {
    const entry = await this.find();
    return ensure(entry, `User '${this.userId}' has no entry`);
  }

  async getForModification() {
    const entry = await this.get();
    this.ensureIsModifiable(entry);
    return entry;
  }

  ensureIsModifiable(entry: { status: EntryStatusKinds; _id: Id<"entries"> }) {
    if (entry.status !== "draft" && entry.status !== "approved")
      throw new Error(
        `Entry of id '${entry._id}' with status '${entry.status}' is not in draft or approved status and cannot be modified. Current status: ${entry.status}`,
      );
  }
}
