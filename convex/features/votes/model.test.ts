import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type {
  AuthenticatedConvexTest,
  ConvexTest,
} from "../common/tests/testingHelpers.vitest";
import {
  createApprovedTestEntryToVoteFor,
  createConvexTest,
  createTestEntry,
  createTestUser,
  ensureTestCompetitions,
  insertTestVote,
  moveEntryToStatus,
  signInAsTestUser,
} from "../common/tests/testingHelpers.vitest";
import { votingClosedMessage } from "../../../shared/eventStatus";
import { GEO_TOKEN_LIFETIME_MS, signGeoToken } from "../../../shared/geoToken";
import { competitions } from "../competitions/model";
import { aggregateVotes, voteNamespace, type VoteTally } from "./lib";
import { OWN_ENTRY_VOTE_MESSAGE, SAME_INBOX_VOTE_MESSAGE } from "./model";
import { canonicalEmail } from "../../../shared/auth";
import { rankEntries } from "./results";

const secret = "test-geo-secret";
const busselton = {
  country: "AU",
  region: "Western Australia",
  regionCode: "WA",
  city: "Busselton",
  latitude: -33.65,
  longitude: 115.35,
  timezone: "Australia/Perth",
};
const sydney = {
  country: "AU",
  region: "New South Wales",
  regionCode: "NSW",
  city: "Sydney",
};
const london = { country: "GB", region: "England", city: "London" };

const geoToken = (location: object, issuedAt = Date.now()) =>
  signGeoToken({ ...location, issuedAt, nonce: crypto.randomUUID() }, secret);

const countVotes = (t: AuthenticatedConvexTest, tally: VoteTally) =>
  t.run(async (ctx) => {
    const competition = await competitions.query(ctx).current();
    return await aggregateVotes.count(ctx, {
      namespace: voteNamespace(competition._id, tally),
    });
  });

const openVoting = (t: AuthenticatedConvexTest) =>
  t.run(async (ctx) => {
    const competition = await competitions.query(ctx).current();
    await ctx.db.patch(competition._id, { votingOpen: true });
  });

const storedVotes = (t: AuthenticatedConvexTest) =>
  t.run((ctx) => ctx.db.query("votes").collect());

const signInAs = async (base: ConvexTest, user: Partial<Doc<"users">> = {}) =>
  signInAsTestUser(base, await createTestUser(base, { user }));

// A signed in voter, plus the unsigned test so others can sign in too
const setup = async () => {
  const base = createConvexTest();
  const user = await createTestUser(base);
  return { base, t: signInAsTestUser(base, user), user };
};

beforeEach(() => {
  vi.stubEnv("GEO_TOKEN_SECRET", secret);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("voting pause", () => {
  let t: AuthenticatedConvexTest;

  beforeEach(async () => {
    const testContext = await setup();
    t = testContext.t;
  });

  it("rejects new votes", async () => {
    const entry = await createApprovedTestEntryToVoteFor(t);

    await expect(
      t.mutation(api.my.votes.vote, { entryId: entry._id, sawInPerson: true }),
    ).rejects.toThrow(votingClosedMessage(2026));

    expect(await storedVotes(t)).toHaveLength(0);
  });

  it("rejects removing a vote and keeps it", async () => {
    const entry = await createApprovedTestEntryToVoteFor(t);
    await openVoting(t);
    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      sawInPerson: false,
    });
    await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      await ctx.db.patch(competition._id, { votingOpen: false });
    });
    const [vote] = await storedVotes(t);

    await expect(
      t.mutation(api.my.votes.cancel, { voteId: vote._id }),
    ).rejects.toThrow(votingClosedMessage(2026));
    expect(await storedVotes(t)).toHaveLength(1);
  });
});

describe("one vote per person", () => {
  let base: ConvexTest;
  let t: AuthenticatedConvexTest;

  beforeEach(async () => {
    ({ base, t } = await setup());
    await openVoting(t);
  });

  it("accepts a vote for someone else's approved entry", async () => {
    const entry = await createApprovedTestEntryToVoteFor(t);

    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      sawInPerson: false,
    });

    const votes = await storedVotes(t);
    expect(votes).toHaveLength(1);
    expect(votes[0].entryId).toBe(entry._id);
    expect(await t.query(api.my.votes.mine, {})).toMatchObject({
      entry: { _id: entry._id },
      inPerson: false,
    });
  });

  it("moves the vote when they vote for another entry", async () => {
    const first = await createApprovedTestEntryToVoteFor(t);
    const second = await createApprovedTestEntryToVoteFor(t);

    await t.mutation(api.my.votes.vote, {
      entryId: first._id,
      sawInPerson: false,
    });
    await t.mutation(api.my.votes.vote, {
      entryId: second._id,
      sawInPerson: false,
    });

    const votes = await storedVotes(t);
    expect(votes.map((vote) => vote.entryId)).toEqual([second._id]);
    expect(await countVotes(t, "online")).toBe(1);
  });

  it("removes the vote and takes it off the counts", async () => {
    const entry = await createApprovedTestEntryToVoteFor(t);
    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      sawInPerson: false,
    });
    expect(await countVotes(t, "online")).toBe(1);

    const vote = await t.query(api.my.votes.mine, {});
    if (!vote) throw new Error("Expected a vote");
    await t.mutation(api.my.votes.cancel, { voteId: vote._id });

    expect(await storedVotes(t)).toHaveLength(0);
    expect(await countVotes(t, "online")).toBe(0);
    expect(await t.query(api.my.votes.mine, {})).toBeNull();
  });

  it("won't remove someone else's vote", async () => {
    const entry = await createApprovedTestEntryToVoteFor(t);
    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      sawInPerson: false,
    });
    const [vote] = await storedVotes(t);

    const other = await signInAs(base, { name: "Someone Else" });
    await expect(
      other.mutation(api.my.votes.cancel, { voteId: vote._id }),
    ).rejects.toThrow("cannot cancel another user's vote");
    expect(await storedVotes(t)).toHaveLength(1);
  });

  it("rejects votes for entries that aren't approved", async () => {
    const entry = await createApprovedTestEntryToVoteFor(t);

    for (const status of ["draft", "submitted"] as const) {
      await moveEntryToStatus(t, { entryId: entry._id, status });
      await expect(
        t.mutation(api.my.votes.vote, {
          entryId: entry._id,
          sawInPerson: false,
        }),
      ).rejects.toThrow("that entry isn't available");
    }

    expect(await storedVotes(t)).toHaveLength(0);
  });

  it("rejects votes for an approved entry from a past competition", async () => {
    const entry = await createApprovedTestEntryToVoteFor(t);
    await t.run(async (ctx) => {
      const legacy = (await ensureTestCompetitions(ctx)).past;
      await ctx.db.patch(entry._id, { competitionId: legacy._id });
    });

    await expect(
      t.mutation(api.my.votes.vote, { entryId: entry._id, sawInPerson: false }),
    ).rejects.toThrow("from a past competition");
  });
});

describe("no self-votes", () => {
  it("won't let an entrant vote for their own entry", async () => {
    const { t } = await setup();
    await openVoting(t);
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, { entryId: entry._id, status: "approved" });

    expect(
      await t.query(api.my.votes.getForEntry, { entryId: entry._id }),
    ).toEqual({ isOwnEntry: true, vote: null });
    await expect(
      t.mutation(api.my.votes.vote, { entryId: entry._id, sawInPerson: true }),
    ).rejects.toThrow(OWN_ENTRY_VOTE_MESSAGE);
    expect(await storedVotes(t)).toHaveLength(0);

    // They can still vote for someone else's
    const other = await createApprovedTestEntryToVoteFor(t);
    await t.mutation(api.my.votes.vote, {
      entryId: other._id,
      sawInPerson: true,
    });
    expect(
      await t.query(api.my.votes.getForEntry, { entryId: other._id }),
    ).toMatchObject({ isOwnEntry: false, vote: { entry: { _id: other._id } } });
  });
});

describe("one vote per inbox", () => {
  const voteAs = async (
    base: ConvexTest,
    email: string,
    entryId: Id<"entries">,
  ) =>
    (
      await signInAs(base, { email, canonicalEmail: canonicalEmail(email) })
    ).mutation(api.my.votes.vote, { entryId, sawInPerson: false });

  it("won't take a second vote from another spelling of the same email", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const entry = await createApprovedTestEntryToVoteFor(t);
    await voteAs(base, "john.smith@gmail.com", entry._id);

    for (const email of ["johnsmith@gmail.com", "john.smith+2@googlemail.com"])
      await expect(voteAs(base, email, entry._id)).rejects.toThrow(
        SAME_INBOX_VOTE_MESSAGE,
      );
    expect(await storedVotes(t)).toHaveLength(1);

    // A different person is fine
    await voteAs(base, "jane.smith@gmail.com", entry._id);
    expect(await storedVotes(t)).toHaveLength(2);
  });

  it("works for users the backfill hasn't reached yet", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const entry = await createApprovedTestEntryToVoteFor(t);
    await voteAs(base, "jane.doe@outlook.com", entry._id);

    const unfilled = await signInAs(base, { email: "jane.doe+x@outlook.com" });
    await expect(
      unfilled.mutation(api.my.votes.vote, {
        entryId: entry._id,
        sawInPerson: false,
      }),
    ).rejects.toThrow(SAME_INBOX_VOTE_MESSAGE);
  });

  it("still lets them change their own vote", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const first = await createApprovedTestEntryToVoteFor(t);
    const second = await createApprovedTestEntryToVoteFor(t);
    const voter = await signInAs(base, {
      email: "john.smith@gmail.com",
      canonicalEmail: "johnsmith@gmail.com",
    });

    for (const entry of [first, second])
      await voter.mutation(api.my.votes.vote, {
        entryId: entry._id,
        sawInPerson: false,
      });

    expect((await storedVotes(t)).map((vote) => vote.entryId)).toEqual([
      second._id,
    ]);
  });

  it("counts an entry from another spelling of their email as their own", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const entry = await createApprovedTestEntryToVoteFor(t, {
      email: "john.smith@gmail.com",
      canonicalEmail: "johnsmith@gmail.com",
    });

    await expect(
      voteAs(base, "johnsmith+vote@gmail.com", entry._id),
    ).rejects.toThrow(OWN_ENTRY_VOTE_MESSAGE);
  });
});

describe("in-person votes", () => {
  let base: ConvexTest;
  let t: AuthenticatedConvexTest;
  let entryId: Id<"entries">;

  beforeEach(async () => {
    ({ base, t } = await setup());
    await openVoting(t);
    entryId = (await createApprovedTestEntryToVoteFor(t))._id;
  });

  const vote = async (args: { sawInPerson: boolean; geoToken?: string }) =>
    await t.mutation(api.my.votes.vote, { entryId, ...args });

  const theVote = async () => {
    const [stored] = await storedVotes(t);
    if (!stored || "category" in stored) throw new Error("Expected a vote");
    return stored;
  };

  it("counts as in person with a token from Australia and the tick", async () => {
    expect(
      await vote({ sawInPerson: true, geoToken: await geoToken(busselton) }),
    ).toEqual({ inPerson: true, locationCheck: "ok" });

    expect(await theVote()).toMatchObject({
      inPerson: true,
      sawInPerson: true,
      locationCheck: "ok",
      location: busselton,
    });
    expect(await countVotes(t, "in_person")).toBe(1);
    expect(await countVotes(t, "online")).toBe(0);
  });

  it("counts for People's Choice only without the tick", async () => {
    expect(
      await vote({ sawInPerson: false, geoToken: await geoToken(busselton) }),
    ).toEqual({ inPerson: false, locationCheck: "ok" });
    expect(await countVotes(t, "online")).toBe(1);
  });

  it("counts for People's Choice only from overseas, even with the tick", async () => {
    expect(
      await vote({ sawInPerson: true, geoToken: await geoToken(london) }),
    ).toEqual({ inPerson: false, locationCheck: "outside_area" });
    // Kept so admins can see where it came from
    expect(await theVote()).toMatchObject({
      sawInPerson: true,
      location: london,
    });
  });

  it("doesn't trust a missing, expired or forged token", async () => {
    expect(await vote({ sawInPerson: true })).toEqual({
      inPerson: false,
      locationCheck: "no_location",
    });

    const stale = await geoToken(
      busselton,
      Date.now() - GEO_TOKEN_LIFETIME_MS - 60_000,
    );
    expect(await vote({ sawInPerson: true, geoToken: stale })).toEqual({
      inPerson: false,
      locationCheck: "expired",
    });

    const forged = await signGeoToken(
      { ...busselton, issuedAt: Date.now(), nonce: crypto.randomUUID() },
      "a-guessed-secret",
    );
    expect(await vote({ sawInPerson: true, geoToken: forged })).toEqual({
      inPerson: false,
      locationCheck: "invalid",
    });
    expect((await theVote()).location).toBeUndefined();
  });

  it("is off when the secret isn't configured", async () => {
    vi.stubEnv("GEO_TOKEN_SECRET", "");
    const token = await geoToken(busselton);

    expect(await vote({ sawInPerson: true, geoToken: token })).toEqual({
      inPerson: false,
      locationCheck: "not_configured",
    });
    expect(
      await t.query(api.public.votes.inPersonCheck, { geoToken: token }),
    ).toMatchObject({ locationCheck: "not_configured" });
  });

  it("can be limited to WA by admins", async () => {
    await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      await competitions
        .mutate(ctx)
        .setInPersonArea(competition._id, { countries: ["AU"], waOnly: true });
    });

    const fromSydney = await geoToken(sydney);
    expect(await vote({ sawInPerson: true, geoToken: fromSydney })).toEqual({
      inPerson: false,
      locationCheck: "outside_area",
    });
    expect(
      await vote({ sawInPerson: true, geoToken: await geoToken(busselton) }),
    ).toEqual({ inPerson: true, locationCheck: "ok" });
  });

  it("lets the vote page check before voting", async () => {
    expect(
      await t.query(api.public.votes.inPersonCheck, {
        geoToken: await geoToken(sydney),
      }),
    ).toEqual({
      locationCheck: "ok",
      area: { countries: ["AU"], waOnly: false },
    });
    expect(
      await t.query(api.public.votes.inPersonCheck, {
        geoToken: await geoToken(london),
      }),
    ).toMatchObject({ locationCheck: "outside_area" });
    expect(await t.query(api.public.votes.inPersonCheck, {})).toMatchObject({
      locationCheck: "no_location",
    });
  });

  it("only accepts each location token once", async () => {
    const token = await geoToken(busselton);
    expect(await vote({ sawInPerson: true, geoToken: token })).toEqual({
      inPerson: true,
      locationCheck: "ok",
    });

    // Passed on to someone else, or sent again
    const friend = await signInAs(base, { name: "Friend" });
    expect(
      await friend.mutation(api.my.votes.vote, {
        entryId,
        sawInPerson: true,
        geoToken: token,
      }),
    ).toEqual({ inPerson: false, locationCheck: "reused" });
    expect(await vote({ sawInPerson: true, geoToken: token })).toEqual({
      inPerson: false,
      locationCheck: "reused",
    });
    expect((await theVote()).location).toBeUndefined();

    // A fresh one works again
    expect(
      await vote({ sawInPerson: true, geoToken: await geoToken(busselton) }),
    ).toEqual({ inPerson: true, locationCheck: "ok" });
  });

  it("forgets used tokens once they'd have expired anyway", async () => {
    await vote({ sawInPerson: true, geoToken: await geoToken(busselton) });
    const old = await geoToken(busselton, Date.now() - GEO_TOKEN_LIFETIME_MS);
    await vote({ sawInPerson: true, geoToken: old });
    expect(
      await t.run((ctx) => ctx.db.query("usedGeoTokens").collect()),
    ).toHaveLength(2);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 1);
    try {
      expect(
        await t.mutation(internal.internal.cleanup.cleanupUsedGeoTokens, {}),
      ).toEqual({ deleted: 1 });
    } finally {
      vi.useRealTimers();
    }
    expect(
      await t.run((ctx) => ctx.db.query("usedGeoTokens").collect()),
    ).toHaveLength(1);
  });

  it("moves the count when a vote changes to in person", async () => {
    await vote({ sawInPerson: false, geoToken: await geoToken(busselton) });
    expect(await countVotes(t, "online")).toBe(1);

    await vote({ sawInPerson: true, geoToken: await geoToken(busselton) });
    expect(await countVotes(t, "online")).toBe(0);
    expect(await countVotes(t, "in_person")).toBe(1);
  });
});

describe("results", () => {
  it("ranks In-Person Favourites by in-person votes and People's Choice by all", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const a = await createApprovedTestEntryToVoteFor(t, { name: "A" });
    const b = await createApprovedTestEntryToVoteFor(t, { name: "B" });
    const ballots = [
      { entryId: a._id, inPerson: true },
      { entryId: b._id, inPerson: false },
      { entryId: b._id, inPerson: false },
      { entryId: b._id, inPerson: true },
      { entryId: a._id, inPerson: true },
    ];
    for (const [i, ballot] of ballots.entries())
      await (
        await signInAs(base, { name: `Voter ${i}` })
      ).mutation(api.my.votes.vote, {
        entryId: ballot.entryId,
        sawInPerson: ballot.inPerson,
        geoToken: await geoToken(busselton),
      });

    const asAdmin = await signInAs(base, { isCompetitionAdmin: true });
    const results = await asAdmin.query(
      api.admin.competition.votes.results,
      {},
    );

    expect(
      results.inPersonFavourites.map((row) => [row.entryId, row.votes]),
    ).toEqual([
      [a._id, 2],
      [b._id, 1],
    ]);
    expect(
      results.peoplesChoice.map((row) => [row.entryId, row.votes]),
    ).toEqual([
      [b._id, 3],
      [a._id, 2],
    ]);
  });

  it("gives tied entries the same rank", () => {
    const row = (entryNumber: number, votes: number) => ({
      entryId: `e${entryNumber}` as Id<"entries">,
      entryNumber,
      entryName: `Entry ${entryNumber}`,
      votes,
    });
    expect(
      rankEntries([row(4, 2), row(1, 5), row(2, 2), row(3, 0), row(5, 1)]).map(
        (r) => [r.entryNumber, r.rank],
      ),
    ).toEqual([
      [1, 1],
      [2, 2],
      [4, 2],
      [5, 4],
    ]);
  });
});

describe("2025 votes", () => {
  it("stay valid and viewable but don't count as this year's vote", async () => {
    const { base, t, user } = await setup();
    await openVoting(t);
    const entry = await createApprovedTestEntryToVoteFor(t);
    const competitionIds = await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      await ctx.db.patch(entry._id, { competitionId: past._id });
      for (const category of ["best_display", "most_jolly"] as const)
        await insertTestVote(ctx, {
          competitionId: past._id,
          entryId: entry._id,
          votingUserId: user._id,
          category,
        });
      return { past: past._id, current: current._id };
    });

    expect(await t.query(api.my.votes.mine, {})).toBeNull();

    const asAdmin = await signInAs(base, { isCompetitionAdmin: true });
    const results = await asAdmin.query(api.admin.competition.votes.results, {
      competitionId: competitionIds.past,
    });
    expect(results.year).toBe(2025);
    expect(results.legacyCategories.best_display).toMatchObject([
      { entryId: entry._id, votes: 1 },
    ]);
    expect(results.peoplesChoice).toEqual([]);

    const page = await asAdmin.query(api.admin.competition.votes.listPage, {
      competitionId: competitionIds.past,
      flaggedOnly: false,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page.map((vote) => vote.category).sort()).toEqual([
      "best_display",
      "most_jolly",
    ]);
  });
});

describe("admin vote review", () => {
  it("lists votes with their location and picks out flagged ones", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const entry = await createApprovedTestEntryToVoteFor(t);
    const local = await signInAs(base, { name: "Local" });
    const overseas = await signInAs(base, { name: "Overseas" });
    await local.mutation(api.my.votes.vote, {
      entryId: entry._id,
      sawInPerson: true,
      geoToken: await geoToken(busselton),
    });
    await overseas.mutation(api.my.votes.vote, {
      entryId: entry._id,
      sawInPerson: true,
      geoToken: await geoToken(london),
    });

    const asAdmin = await signInAs(base, { isCompetitionAdmin: true });
    const listPage = (flaggedOnly: boolean) =>
      asAdmin.query(api.admin.competition.votes.listPage, {
        flaggedOnly,
        paginationOpts: { numItems: 10, cursor: null },
      });

    expect((await listPage(false)).page).toHaveLength(2);
    const flagged = (await listPage(true)).page;
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toMatchObject({
      voterName: "Overseas",
      inPerson: false,
      sawInPerson: true,
      locationCheck: "outside_area",
      location: { country: "GB", city: "London" },
    });

    const exported = await asAdmin.action(
      api.admin.competition.votes.getAllVotesForExport,
      {},
    );
    expect(exported.map((vote) => vote.location?.city).sort()).toEqual([
      "Busselton",
      "London",
    ]);
  });

  it("checks the in-person area admins set", async () => {
    const { base, t } = await setup();
    const asAdmin = await signInAs(base, { isCompetitionAdmin: true });

    expect(
      await asAdmin.query(api.admin.competition.competitions.getInPersonArea),
    ).toEqual({ countries: ["AU"], waOnly: false });

    await asAdmin.mutation(api.admin.competition.competitions.setInPersonArea, {
      countries: [" au", "NZ", "AU"],
      waOnly: true,
    });
    expect(
      await asAdmin.query(api.admin.competition.competitions.getInPersonArea),
    ).toEqual({ countries: ["AU", "NZ"], waOnly: true });

    await expect(
      asAdmin.mutation(api.admin.competition.competitions.setInPersonArea, {
        countries: [],
        waOnly: false,
      }),
    ).rejects.toThrow("at least one country");
    await expect(
      asAdmin.mutation(api.admin.competition.competitions.setInPersonArea, {
        countries: ["Australia"],
        waOnly: false,
      }),
    ).rejects.toThrow("isn't a two-letter country code");
    await expect(
      t.mutation(api.admin.competition.competitions.setInPersonArea, {
        countries: ["US"],
        waOnly: false,
      }),
    ).rejects.toThrow();
  });
});

describe("short QR links", () => {
  it("find this year's approved entry by its number", async () => {
    const { t } = await setup();
    const entry = await createApprovedTestEntryToVoteFor(t);
    const findByNumber = (entryNumber: number) =>
      t.query(api.public.entries.findByNumberWithPhotos, { entryNumber });

    expect((await findByNumber(entry.entryNumber ?? -1))?.entry._id).toBe(
      entry._id,
    );
    expect(await findByNumber(9999)).toBeNull();

    // A reserved number on an entry that isn't approved yet isn't found
    await moveEntryToStatus(t, {
      entryId: entry._id,
      status: "submitted",
      overrides: { entryNumber: entry.entryNumber },
    });
    expect(await findByNumber(entry.entryNumber ?? -1)).toBeNull();
  });
});
