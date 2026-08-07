import { v } from "convex/values";
import { userSystemAdminMutation } from "./lib";
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
    const competition = await competitions.query(context).current();
    const result = await entries.mutate(context).wipeAll(competition._id);

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
    await context.db.delete(myEntry._id);
    return null;
  })
  .public();

export const deleteById = userSystemAdminMutation
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    await entries.mutate(context).forEntry(input.entryId).delete();
    return null;
  })
  .public();
