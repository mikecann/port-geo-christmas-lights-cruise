import { competitionAdminQuery } from "../../features/common/auth";
import { competitions } from "../../features/competitions/model";
import { entries } from "../../features/entries/model";
import { describeNumbers } from "../../features/entries/numbers";
import type { Id } from "../../_generated/dataModel";
import type { EntryStateKind } from "../../features/entries/schema";

// Which numbers this year's entries use, which are kept for last year's
// entrants, and which are free
export const list = competitionAdminQuery
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const competitionEntries = await context.db
      .query("entries")
      .withIndex("by_competitionId_and_status", (q) =>
        q.eq("competitionId", competition._id),
      )
      .collect();

    const holders = new Map<
      number,
      { entryId: Id<"entries">; name: string; status: EntryStateKind }
    >();
    for (const entry of competitionEntries)
      if (
        entry.state.kind !== "rejected" &&
        entry.state.entryNumber !== undefined
      )
        holders.set(entry.state.entryNumber, {
          entryId: entry._id,
          name: entry.state.name ?? "",
          status: entry.state.kind,
        });

    // Only while entries are open, so this is empty once they close
    const [previousCompetition] = await competitions
      .query(context)
      .listBeforeYear(competition.year, 1);
    const ownerByNumber = await entries
      .query(context)
      .listReservedNumbers(competition);
    const reserved = new Map<
      number,
      { name: string; year: number; email?: string }
    >();
    for (const [entryNumber, userId] of ownerByNumber) {
      const lastEntry = previousCompetition
        ? await entries
            .query(context)
            .forUser(previousCompetition._id, userId)
            .find()
        : null;
      const owner = await context.db.get(userId);
      reserved.set(entryNumber, {
        name: lastEntry?.state.name ?? owner?.name ?? "",
        year: previousCompetition?.year ?? competition.year - 1,
        email: owner?.email,
      });
    }

    return {
      range: competitions.entryNumberRange(competition),
      entriesOpen: competition.entriesOpen,
      numbers: describeNumbers({
        range: competitions.entryNumberRange(competition),
        holders,
        reserved,
      }),
    };
  })
  .public();
