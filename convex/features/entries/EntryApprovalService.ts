import { Id } from "../../_generated/dataModel";
import { MutationService } from "../lib";

export class EntryApprovalService extends MutationService {
  async approve({
    entryNumber,
    entryId,
  }: {
    entryNumber: number;
    entryId: Id<"entries">;
  }) {
    await this.services.entries.ensureEntryIsInStatus({
      entryId,
      status: "submitted",
    });

    await this.context.db.patch(entryId, {
      status: "approved",
      approvedAt: Date.now(),
      entryNumber,
    });
  }
}
