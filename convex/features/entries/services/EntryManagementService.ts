import { Id } from "../../../_generated/dataModel";
import { MutationService } from "../../lib";
import { randomIntRange } from "../../../../shared/num";
import { MAX_ENTRY_NUMBER } from "../../../../shared/constants";
import { photos } from "../../photos/model";

export class EntryManagementService extends MutationService {
  async delete({ entryId }: { entryId: Id<"entries"> }) {
    const entry = await this.services.entries.get({ entryId });

    // Delete all photos for this entry
    await photos.forEntry(entryId).deleteAll(this.context);

    await this.context.db.delete(entryId);
  }

  async setEntryNumber({
    entryId,
    entryNumber,
  }: {
    entryId: Id<"entries">;
    entryNumber: number;
  }) {
    await this.services.entries.get({ entryId });
    await this.context.db.patch(entryId, { entryNumber });
  }

  async getNextAvailableEntryNumber() {
    const approvedEntries = await this.services.entries.listApproved();
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
  }

  async wipeAll() {
    const allEntries = await this.context.db.query("entries").collect();
    let deletedCount = 0;
    for (const entry of allEntries) {
      // Use the proper delete method to clean up photos
      await this.delete({ entryId: entry._id });
      deletedCount++;
    }
    return { deletedCount };
  }
}
