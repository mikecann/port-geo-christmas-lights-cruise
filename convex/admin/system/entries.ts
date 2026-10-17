import { ConvexError, v } from "convex/values";
import { ensureDestructiveWipesAllowed, userSystemAdminMutation } from "./lib";
import { entries } from "../../features/entries/model";
import { createMockEntries } from "../../features/entries/testing";
import { competitions } from "../../features/competitions/model";

// Mutations

export const generateMock = userSystemAdminMutation
  .input({
    count: v.optional(v.number()),
  })
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await createMockEntries(context, {
      count: input.count ?? 10,
      competitionId: competition._id,
    });
    return null;
  })
  .public();

export const wipeCurrentCompetition = userSystemAdminMutation
  .input({})
  .handler(async (context) => {
    ensureDestructiveWipesAllowed();
    const result = await entries.mutate(context).wipeCurrentCompetition();

    return {
      message: `Successfully deleted ${result.deletedCount} current competition entries`,
      deletedCount: result.deletedCount,
    };
  })
  .public();

export const deleteMine = userSystemAdminMutation
  .input({})
  .handler(async (context) => {
    const user = await context.getUser();
    const competition = await competitions.query(context).current();
    const myEntry = await entries
      .query(context)
      .forUser(competition._id, user._id)
      .get();
    if (!myEntry) throw new Error("No entry found for current user");
    // Goes through the model so the entry's photos and files go too
    await entries.mutate(context).forEntry(myEntry._id).delete();
    return null;
  })
  .public();

export const deleteById = userSystemAdminMutation
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    const entry = await entries.query(context).forEntry(input.entryId).get();
    const competition = await competitions.query(context).current();
    if (entry.competitionId !== competition._id)
      throw new ConvexError(
        "Entries from past competitions are kept as history and can't be deleted here.",
      );
    await entries.mutate(context).forEntry(input.entryId).delete();
    return null;
  })
  .public();
