import { Id } from "../../../_generated/dataModel";
import { MutationService } from "../../lib";

export class EntryRejectionService extends MutationService {
  async reject({
    entryId,
    rejectedReason,
  }: {
    entryId: Id<"entries">;
    rejectedReason: string;
  }) {
    await this.services.entries.ensureEntryIsInStatus({
      entryId,
      status: "submitted",
    });

    await this.context.db.patch(entryId, {
      status: "rejected",
      rejectedAt: Date.now(),
      rejectedReason,
    });
  }
}
