import { v } from "convex/values";
import { userSystemAdminMutation } from "./lib";
import { entries } from "../../features/entries/model";
import { api } from "../../_generated/api";
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

export const wipeAll = userSystemAdminMutation
  .input({})
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const result = await entries.mutate(context).wipeAll(competition._id);

    return {
      message: `Successfully deleted ${result.deletedCount} entries`,
      deletedCount: result.deletedCount,
    };
  })
  .public();

export const wipeAllTestUsers = userSystemAdminMutation
  .input({})
  .handler(async (context) => {
    const allUsers = await context.db.query("users").collect();
    const testUsers = allUsers.filter((user) => user.isTestUser === true);

    let deletedCount = 0;
    for (const user of testUsers) {
      await context.db.delete(user._id);
      deletedCount++;
    }

    return {
      message: `Successfully deleted ${deletedCount} test users`,
      deletedCount,
    };
  })
  .public();

export const wipeAllMockData = userSystemAdminMutation
  .input({})
  .handler(async (context) => {
    await context.runMutation(api.admin.system.entries.wipeAll, {});
    await context.runMutation(api.admin.system.entries.wipeAllTestUsers, {});
    await context.runMutation(api.admin.system.votes.wipeAll, {});

    return {
      message: `Successfully deleted all entries and test users`,
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
