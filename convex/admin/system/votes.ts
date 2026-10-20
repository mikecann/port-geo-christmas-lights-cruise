import { ensureDestructiveWipesAllowed } from "./lib";
import { systemAdminMutation } from "../../features/common/auth";
import { votes } from "../../features/votes/model";
import { v } from "convex/values";
import { competitions } from "../../features/competitions/model";

// Mutations

export const wipeCurrentCompetition = systemAdminMutation
  .input({})
  .returns(
    v.object({
      message: v.string(),
      deleted: v.number(),
    }),
  )
  .handler(async (context) => {
    ensureDestructiveWipesAllowed();
    const competition = await competitions.query(context).current();
    const result = await votes.wipeForCompetition(context.db, competition._id);
    return {
      message: `Successfully deleted ${result.deleted} current competition votes`,
      deleted: result.deleted,
    };
  })
  .public();

export const generateMock = systemAdminMutation
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
        q.eq("competitionId", competition._id).eq("state.kind", "approved"),
      )
      .collect();

    if (approvedEntries.length === 0)
      throw new Error(
        "No approved entries found. Generate mock entries first.",
      );

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

    const randomEntry = () =>
      approvedEntries[Math.floor(Math.random() * approvedEntries.length)];

    // A best display vote each, about half of them in person, and a Most
    // Jolly vote from most of those who were there
    for (let i = 0; i < input.count; i++) {
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

      // Every tenth is from overseas, so the flagged list has some too
      const isOverseas = i % 10 === 9;
      const inPerson = !isOverseas && Math.random() < 0.5;
      const vote = {
        competitionId: competition._id,
        votingUserId: userId,
        inPerson,
        sawInPerson: inPerson || isOverseas,
        locationCheck: isOverseas ? ("outside_area" as const) : ("ok" as const),
        location: isOverseas
          ? {
              country: "US",
              region: "California",
              city: "Los Angeles",
              issuedAt: Date.now(),
            }
          : {
              country: "AU",
              region: "Western Australia",
              regionCode: "WA",
              city: "Busselton",
              issuedAt: Date.now(),
            },
        castAt: Date.now(),
      };

      await context.db.insert("votes", {
        ...vote,
        entryId: randomEntry()._id,
        category: "best_display",
      });
      totalVotesCreated++;

      if (inPerson && Math.random() < 0.7) {
        await context.db.insert("votes", {
          ...vote,
          entryId: randomEntry()._id,
          category: "most_jolly",
        });
        totalVotesCreated++;
      }
    }

    return {
      message: `Successfully generated ${totalVotesCreated} mock votes from ${mockUsers.length} fake users`,
      votesCreated: totalVotesCreated,
      usersCreated: mockUsers.length,
    };
  })
  .public();
