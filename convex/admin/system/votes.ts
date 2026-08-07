import { userSystemAdminMutation } from "./lib";
import { votes } from "../../features/votes/model";
import { v } from "convex/values";
import { competitions } from "../../features/competitions/model";

// Mutations

export const wipeCurrentCompetition = userSystemAdminMutation
  .input({})
  .returns(
    v.object({
      message: v.string(),
      deleted: v.number(),
    }),
  )
  .handler(async (context) => {
    const competition = await competitions.query(context).current();
    const result = await votes.wipeAll(context.db, competition._id);
    return {
      message: `Successfully deleted ${result.deleted} current competition votes`,
      deleted: result.deleted,
    };
  })
  .public();

export const generateMock = userSystemAdminMutation
  .input({
    count: v.number(),
  })
  .returns(
    v.object({
      message: v.string(),
      votesCreated: v.number(),
      usersCreated: v.number(),
    }),
  )
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    const approvedEntries = await context.db
      .query("entries")
      .withIndex("by_competitionId_and_status", (q) =>
        q.eq("competitionId", competition._id).eq("status", "approved"),
      )
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

    for (let i = 0; i < Math.ceil(input.count / 2); i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[(i + 3) % lastNames.length];
      const domain = domains[i % domains.length];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`;

      const userId = await context.db.insert("users", {
        name: `${firstName} ${lastName}`,
        email,
        isTestUser: true,
      });

      mockUsers.push(userId);

      for (const category of categories) {
        if (totalVotesCreated >= input.count) break;

        const randomEntry =
          approvedEntries[Math.floor(Math.random() * approvedEntries.length)];

        await context.db.insert("votes", {
          competitionId: competition._id,
          entryId: randomEntry._id,
          votingUserId: userId,
          category,
        });

        totalVotesCreated++;
      }

      if (totalVotesCreated >= input.count) break;
    }

    return {
      message: `Successfully generated ${totalVotesCreated} mock votes from ${mockUsers.length} fake users`,
      votesCreated: totalVotesCreated,
      usersCreated: mockUsers.length,
    };
  })
  .public();
