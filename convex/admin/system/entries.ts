import { v } from "convex/values";
import { userSystemAdminMutation } from "./lib";
import { entries } from "../../features/entries/model";
import { photos } from "../../features/photos/model";
import { api } from "../../_generated/api";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "../../_generated/dataModel";
import { createMockEntries } from "../../features/entries/testing";

// Mutations

export const generateMock = userSystemAdminMutation({
  args: {
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await createMockEntries(ctx.db, { count: args.count ?? 10 });
  },
});

export const wipeAll = userSystemAdminMutation({
  args: {},
  returns: v.object({
    message: v.string(),
    deletedCount: v.number(),
  }),
  handler: async (ctx) => {
    const result = await entries.wipeAll(ctx);

    return {
      message: `Successfully deleted ${result.deletedCount} entries`,
      deletedCount: result.deletedCount,
    };
  },
});

export const wipeAllTestUsers = userSystemAdminMutation({
  args: {},
  returns: v.object({
    message: v.string(),
    deletedCount: v.number(),
  }),
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const testUsers = allUsers.filter((user) => user.isTestUser === true);

    let deletedCount = 0;
    for (const user of testUsers) {
      await ctx.db.delete(user._id);
      deletedCount++;
    }

    return {
      message: `Successfully deleted ${deletedCount} test users`,
      deletedCount,
    };
  },
});

export const wipeAllMockData = userSystemAdminMutation({
  args: {},
  returns: v.object({
    message: v.string(),
  }),
  handler: async (ctx) => {
    await ctx.runMutation(api.admin.system.entries.wipeAll, {});
    await ctx.runMutation(api.admin.system.entries.wipeAllTestUsers, {});
    await ctx.runMutation(api.admin.system.votes.wipeAll, {});

    return {
      message: `Successfully deleted all entries and test users`,
    };
  },
});

export const deleteMine = userSystemAdminMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await ctx.getUser();
    const myEntry = await entries.forUser(user._id).get(ctx.db);
    if (!myEntry) throw new Error("No entry found for current user");
    await ctx.db.delete(myEntry._id);
    return null;
  },
});

export const deleteById = userSystemAdminMutation({
  args: { entryId: v.id("entries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await entries.forEntry(args.entryId).delete(ctx);
    return null;
  },
});
