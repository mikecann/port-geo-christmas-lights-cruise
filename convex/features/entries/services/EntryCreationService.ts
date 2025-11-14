import { UserMutationService } from "../../lib";

export class EntryCreationService extends UserMutationService {
  async create() {
    const existing = await this.context.db
      .query("entries")
      .withIndex("by_submittedByUserId", (q) =>
        q.eq("submittedByUserId", this.userId),
      )
      .unique();
    if (existing)
      throw new Error(
        `Cannot enter competition, user '${this.userId}' already has an entry`,
      );

    return await this.context.db.insert("entries", {
      submittedByUserId: this.userId,
      status: "draft",
    });
  }
}
