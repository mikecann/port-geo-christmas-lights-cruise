import { userSystemAdminMutation } from "./lib";
import { votes } from "../../features/votes/model";
import { aggregateVotes } from "../../features/votes/lib";
import { v } from "convex/values";

// Mutations

export const wipeAll = userSystemAdminMutation({
  args: {},
  returns: v.object({
    message: v.string(),
    deleted: v.number(),
  }),
  handler: async (ctx) => {
    const result = await votes.wipeAll(ctx._db);
    await aggregateVotes.clearAll(ctx);
    return {
      message: `Successfully deleted ${result.deleted} votes`,
      deleted: result.deleted,
    };
  },
});

export const generateMock = userSystemAdminMutation({
  args: {
    count: v.number(),
  },
  returns: v.object({
    message: v.string(),
    votesCreated: v.number(),
    usersCreated: v.number(),
  }),
  handler: async (ctx, { count }) => {
    const approvedEntries = await ctx.db
      .query("entries")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    if (approvedEntries.length === 0)
      throw new Error(
        "No approved entries found. Generate mock entries first.",
      );

    const categories: Array<"best_display" | "most_jolly"> = [
      "best_display",
      "most_jolly",
    ];
    const mockUsers: string[] = [];
    let totalVotesCreated = 0;

    const firstNames = [
      "Alice",
      "Bob",
      "Charlie",
      "Diana",
      "Eve",
      "Frank",
      "Grace",
      "Henry",
      "Ivy",
      "Jack",
    ];
    const lastNames = [
      "Smith",
      "Johnson",
      "Brown",
      "Davis",
      "Wilson",
      "Miller",
      "Moore",
      "Taylor",
      "Anderson",
      "Thomas",
    ];
    const domains = [
      "example.com",
      "test.com",
      "demo.org",
      "sample.net",
      "mock.io",
    ];

    for (let i = 0; i < Math.ceil(count / 2); i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[(i + 3) % lastNames.length];
      const domain = domains[i % domains.length];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`;

      const userId = await ctx.db.insert("users", {
        name: `${firstName} ${lastName}`,
        email,
        isTestUser: true,
      });

      mockUsers.push(userId);

      for (const category of categories) {
        if (totalVotesCreated >= count) break;

        const randomEntry =
          approvedEntries[Math.floor(Math.random() * approvedEntries.length)];

        await ctx.db.insert("votes", {
          entryId: randomEntry._id,
          votingUserId: userId,
          category,
        });

        totalVotesCreated++;
      }

      if (totalVotesCreated >= count) break;
    }

    return {
      message: `Successfully generated ${totalVotesCreated} mock votes from ${mockUsers.length} fake users`,
      votesCreated: totalVotesCreated,
      usersCreated: mockUsers.length,
    };
  },
});
