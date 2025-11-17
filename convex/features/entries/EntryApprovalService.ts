import { MutationCtx } from "fluent-convex";
import { Id } from "../../_generated/dataModel";
import { Services } from "./services";

export class EntryApprovalService {
  constructor(
    private readonly context: MutationCtx,
    private readonly services: Services,
  ) {}

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
