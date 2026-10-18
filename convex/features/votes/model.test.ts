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
import {
  MOST_JOLLY_IN_PERSON_MESSAGE,
  SEEN_IN_PERSON_REQUIRED_MESSAGE,
} from "../../../shared/voting";
import { rankEntries } from "./results";
import { isLegacyVote, type VoteCategory } from "./schema";

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

const noVotes = { best_display: null, most_jolly: null };

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
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
        sawInPerson: true,
      }),
    ).rejects.toThrow(votingClosedMessage(2026));

    expect(await storedVotes(t)).toHaveLength(0);
  });

  it("rejects removing a vote and keeps it", async () => {
    const entry = await createApprovedTestEntryToVoteFor(t);
    await openVoting(t);
    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      category: "best_display",
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
      category: "best_display",
      sawInPerson: false,
    });

    const votes = await storedVotes(t);
    expect(votes).toHaveLength(1);
    expect(votes[0].entryId).toBe(entry._id);
    expect(await t.query(api.my.votes.mine, {})).toMatchObject({
      best_display: {
        category: "best_display",
        entry: { _id: entry._id },
        inPerson: false,
      },
      most_jolly: null,
    });
  });

  it("moves the vote when they vote for another entry", async () => {
    const first = await createApprovedTestEntryToVoteFor(t);
    const second = await createApprovedTestEntryToVoteFor(t);

    await t.mutation(api.my.votes.vote, {
      entryId: first._id,
      category: "best_display",
      sawInPerson: false,
    });
    await t.mutation(api.my.votes.vote, {
      entryId: second._id,
      category: "best_display",
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
      category: "best_display",
      sawInPerson: false,
    });
    expect(await countVotes(t, "online")).toBe(1);

    const vote = (await t.query(api.my.votes.mine, {})).best_display;
    if (!vote) throw new Error("Expected a vote");
    await t.mutation(api.my.votes.cancel, { voteId: vote._id });

    expect(await storedVotes(t)).toHaveLength(0);
    expect(await countVotes(t, "online")).toBe(0);
    expect(await t.query(api.my.votes.mine, {})).toEqual(noVotes);
  });

  it("won't remove someone else's vote", async () => {
    const entry = await createApprovedTestEntryToVoteFor(t);
    await t.mutation(api.my.votes.vote, {
      entryId: entry._id,
      category: "best_display",
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
          category: "best_display",
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
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
        sawInPerson: false,
      }),
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
    ).toEqual({ isOwnEntry: true, votes: noVotes });
    await expect(
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
        sawInPerson: true,
      }),
    ).rejects.toThrow(OWN_ENTRY_VOTE_MESSAGE);
    expect(await storedVotes(t)).toHaveLength(0);

    // They can still vote for someone else's
    const other = await createApprovedTestEntryToVoteFor(t);
    await t.mutation(api.my.votes.vote, {
      entryId: other._id,
      category: "best_display",
      sawInPerson: true,
    });
    expect(
      await t.query(api.my.votes.getForEntry, { entryId: other._id }),
    ).toMatchObject({
      isOwnEntry: false,
      votes: { best_display: { entry: { _id: other._id } } },
    });
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
    ).mutation(api.my.votes.vote, {
      entryId,
      category: "best_display",
      sawInPerson: false,
    });

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
        category: "best_display",
        sawInPerson: false,
      }),
    ).rejects.toThrow(SAME_INBOX_VOTE_MESSAGE);
  });

  it("saves the voter's canonical email on the vote, even without one on the user", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const entry = await createApprovedTestEntryToVoteFor(t);
    const unfilled = await signInAs(base, { email: "John.Smith+x@Gmail.com" });

    await unfilled.mutation(api.my.votes.vote, {
      entryId: entry._id,
      category: "best_display",
      sawInPerson: false,
    });

    const [stored] = await storedVotes(t);
    expect(stored).toMatchObject({
      voterCanonicalEmail: "johnsmith@gmail.com",
    });
    await expect(
      voteAs(base, "johnsmith@gmail.com", entry._id),
    ).rejects.toThrow(SAME_INBOX_VOTE_MESSAGE);
  });

  it("won't take another vote however many accounts share the inbox", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const entry = await createApprovedTestEntryToVoteFor(t);
    for (let i = 0; i < 20; i++) {
      const email = `john.smith+${i}@gmail.com`;
      await createTestUser(base, {
        user: { email, canonicalEmail: canonicalEmail(email) },
      });
    }

    // The 21st account votes and the 22nd tries again
    await voteAs(base, "john.smith+20@gmail.com", entry._id);
    await expect(
      voteAs(base, "john.smith+21@gmail.com", entry._id),
    ).rejects.toThrow(SAME_INBOX_VOTE_MESSAGE);
    expect(await storedVotes(t)).toHaveLength(1);
  });

  it("checks this year's older votes once the backfill has filled them in", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const entry = await createApprovedTestEntryToVoteFor(t);
    const earlier = await createTestUser(base, {
      user: { email: "Jane.Doe@Outlook.com" },
    });
    const { voteId, legacyVoteId } = await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      return {
        voteId: await insertTestVote(ctx, {
          competitionId: current._id,
          entryId: entry._id,
          votingUserId: earlier._id,
          inPerson: false,
          sawInPerson: false,
          locationCheck: "no_location",
          castAt: Date.now(),
        }),
        legacyVoteId: await insertTestVote(ctx, {
          competitionId: past._id,
          entryId: entry._id,
          votingUserId: earlier._id,
          category: "best_display",
        }),
      };
    });

    expect(
      await t.mutation(internal.internal.users.normalizeEmails, {}),
    ).toEqual({ updated: 1, votesUpdated: 1 });
    expect(await t.run((ctx) => ctx.db.get(voteId))).toMatchObject({
      voterCanonicalEmail: "jane.doe@outlook.com",
    });
    expect(await t.run((ctx) => ctx.db.get(legacyVoteId))).not.toHaveProperty(
      "voterCanonicalEmail",
    );
    await expect(
      voteAs(base, "jane.doe+2@outlook.com", entry._id),
    ).rejects.toThrow(SAME_INBOX_VOTE_MESSAGE);
    expect(
      await t.mutation(internal.internal.users.normalizeEmails, {}),
    ).toEqual({ updated: 0, votesUpdated: 0 });
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
        category: "best_display",
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

    const email = "johnsmith+vote@gmail.com";
    const entrant = await signInAs(base, {
      email,
      canonicalEmail: canonicalEmail(email),
    });

    expect(
      await entrant.query(api.my.votes.getForEntry, { entryId: entry._id }),
    ).toEqual({ isOwnEntry: true, votes: noVotes });
    await expect(
      entrant.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
        sawInPerson: false,
      }),
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

  const vote = async (args: { sawInPerson?: boolean; geoToken?: string }) =>
    await t.mutation(api.my.votes.vote, {
      entryId,
      category: "best_display",
      ...args,
    });

  const theVote = async () => {
    const [stored] = await storedVotes(t);
    if (!stored || isLegacyVote(stored)) throw new Error("Expected a vote");
    return stored;
  };

  it("counts as in person with a token from Australia when they've seen it", async () => {
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

  it("counts for People's Choice only when they haven't seen it", async () => {
    expect(
      await vote({ sawInPerson: false, geoToken: await geoToken(busselton) }),
    ).toEqual({ inPerson: false, locationCheck: "ok" });
    expect(await countVotes(t, "online")).toBe(1);
  });

  it("counts for People's Choice only from overseas, even if they say they've seen it", async () => {
    expect(
      await vote({ sawInPerson: true, geoToken: await geoToken(london) }),
    ).toEqual({ inPerson: false, locationCheck: "outside_area" });
    // Kept so admins can see where it came from
    expect(await theVote()).toMatchObject({
      sawInPerson: true,
      location: london,
    });
  });

  it("needs a seen or not seen answer when the location check passes", async () => {
    await expect(vote({ geoToken: await geoToken(busselton) })).rejects.toThrow(
      SEEN_IN_PERSON_REQUIRED_MESSAGE,
    );
    expect(await storedVotes(t)).toHaveLength(0);
  });

  it("doesn't need an answer when the location check fails", async () => {
    expect(await vote({ geoToken: await geoToken(london) })).toEqual({
      inPerson: false,
      locationCheck: "outside_area",
    });
    expect(await theVote()).toMatchObject({ sawInPerson: false });

    expect(await vote({})).toEqual({
      inPerson: false,
      locationCheck: "no_location",
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
        category: "best_display",
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
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      await vote({ sawInPerson: true, geoToken: await geoToken(busselton) });
      const old = await geoToken(busselton, Date.now() - GEO_TOKEN_LIFETIME_MS);
      await vote({ sawInPerson: true, geoToken: old });
      expect(
        await t.run((ctx) => ctx.db.query("usedGeoTokens").collect()),
      ).toHaveLength(2);

      vi.setSystemTime(Date.now() + 1);
      expect(
        await t.mutation(internal.internal.cleanup.cleanupUsedGeoTokens, {}),
      ).toEqual({ deleted: 1 });
      expect(
        await t.run((ctx) => ctx.db.query("usedGeoTokens").collect()),
      ).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves the count when a vote changes to in person", async () => {
    await vote({ sawInPerson: false, geoToken: await geoToken(busselton) });
    expect(await countVotes(t, "online")).toBe(1);

    await vote({ sawInPerson: true, geoToken: await geoToken(busselton) });
    expect(await countVotes(t, "online")).toBe(0);
    expect(await countVotes(t, "in_person")).toBe(1);
  });
});

describe("best display and Most Jolly", () => {
  let base: ConvexTest;
  let t: AuthenticatedConvexTest;
  let user: Doc<"users">;
  let first: Id<"entries">;
  let second: Id<"entries">;

  beforeEach(async () => {
    ({ base, t, user } = await setup());
    await openVoting(t);
    first = (await createApprovedTestEntryToVoteFor(t))._id;
    second = (await createApprovedTestEntryToVoteFor(t))._id;
  });

  const voteFor = async (
    entryId: Id<"entries">,
    category: VoteCategory,
    args: { sawInPerson?: boolean; geoToken?: string } = {
      sawInPerson: true,
    },
    voter: AuthenticatedConvexTest = t,
  ) =>
    await voter.mutation(api.my.votes.vote, {
      entryId,
      category,
      geoToken: args.geoToken ?? (await geoToken(busselton)),
      ...(args.sawInPerson === undefined
        ? {}
        : { sawInPerson: args.sawInPerson }),
    });

  const countFor = async (entryId: Id<"entries">, tally: VoteTally) =>
    await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      return await aggregateVotes.count(ctx, {
        namespace: voteNamespace(competition._id, tally),
        bounds: { prefix: [entryId] },
      });
    });

  it("gives each person one vote in each category, on the same display or not", async () => {
    await voteFor(first, "best_display");
    await voteFor(first, "most_jolly");

    expect(await t.query(api.my.votes.mine, {})).toMatchObject({
      best_display: { entry: { _id: first }, inPerson: true },
      most_jolly: { entry: { _id: first }, inPerson: true },
    });
    expect(await countFor(first, "in_person")).toBe(1);
    expect(await countFor(first, "most_jolly")).toBe(1);
    expect(await countFor(first, "online")).toBe(0);

    // Voting again in a category moves that vote and leaves the other
    await voteFor(second, "most_jolly");
    expect(await storedVotes(t)).toHaveLength(2);
    expect(await countFor(first, "most_jolly")).toBe(0);
    expect(await countFor(second, "most_jolly")).toBe(1);
    expect(await countFor(first, "in_person")).toBe(1);
    expect(await t.query(api.my.votes.mine, {})).toMatchObject({
      best_display: { entry: { _id: first } },
      most_jolly: { entry: { _id: second } },
    });
  });

  it("removes one category's vote and keeps the other", async () => {
    await voteFor(first, "best_display");
    await voteFor(second, "most_jolly");

    const { most_jolly } = await t.query(api.my.votes.mine, {});
    if (!most_jolly) throw new Error("Expected a Most Jolly vote");
    await t.mutation(api.my.votes.cancel, { voteId: most_jolly._id });

    expect(await countFor(second, "most_jolly")).toBe(0);
    expect(await countFor(first, "in_person")).toBe(1);
    expect(await t.query(api.my.votes.mine, {})).toMatchObject({
      best_display: { entry: { _id: first } },
      most_jolly: null,
    });
  });

  it("counts best display for People's Choice only when they haven't seen it", async () => {
    await voteFor(first, "best_display", { sawInPerson: false });
    expect(await countFor(first, "online")).toBe(1);
    expect(await countFor(first, "in_person")).toBe(0);

    // Seen it after all: it moves pools rather than counting in both
    await voteFor(first, "best_display", { sawInPerson: true });
    expect(await countFor(first, "online")).toBe(0);
    expect(await countFor(first, "in_person")).toBe(1);
  });

  it("only takes Most Jolly votes from people who've seen it in person", async () => {
    const attempts = [
      { sawInPerson: false },
      { sawInPerson: true, geoToken: await geoToken(london) },
      { sawInPerson: true, geoToken: "not-a-token" },
    ];
    for (const attempt of attempts)
      await expect(voteFor(first, "most_jolly", attempt)).rejects.toThrow(
        MOST_JOLLY_IN_PERSON_MESSAGE,
      );
    await expect(
      voteFor(first, "most_jolly", { sawInPerson: undefined }),
    ).rejects.toThrow(SEEN_IN_PERSON_REQUIRED_MESSAGE);
    expect(await storedVotes(t)).toHaveLength(0);

    // A refused vote doesn't use up the location token
    const token = await geoToken(busselton);
    await expect(
      voteFor(first, "most_jolly", { sawInPerson: false, geoToken: token }),
    ).rejects.toThrow(MOST_JOLLY_IN_PERSON_MESSAGE);
    expect(
      await voteFor(first, "most_jolly", {
        sawInPerson: true,
        geoToken: token,
      }),
    ).toEqual({ inPerson: true, locationCheck: "ok" });
  });

  it("keeps the Most Jolly vote when the location check fails", async () => {
    vi.stubEnv("GEO_TOKEN_SECRET", "");
    await expect(voteFor(first, "most_jolly")).rejects.toThrow(
      MOST_JOLLY_IN_PERSON_MESSAGE,
    );
    // Best display still works, for People's Choice
    expect(await voteFor(first, "best_display")).toEqual({
      inPerson: false,
      locationCheck: "not_configured",
    });
  });

  it("applies one vote per inbox to each category", async () => {
    const asInbox = (email: string) =>
      signInAs(base, { email, canonicalEmail: canonicalEmail(email) });
    const one = await asInbox("john.smith@gmail.com");
    const other = await asInbox("johnsmith+x@gmail.com");

    await voteFor(first, "best_display", undefined, one);
    await expect(
      voteFor(second, "best_display", undefined, other),
    ).rejects.toThrow(SAME_INBOX_VOTE_MESSAGE);
    // Their Most Jolly vote is still free, from either account
    await voteFor(second, "most_jolly", undefined, other);
    await expect(voteFor(first, "most_jolly", undefined, one)).rejects.toThrow(
      SAME_INBOX_VOTE_MESSAGE,
    );
    expect(await storedVotes(t)).toHaveLength(2);
  });

  it("won't take a Most Jolly vote for their own entry", async () => {
    const own = await createTestEntry(t);
    if (!own) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, { entryId: own._id, status: "approved" });

    await expect(voteFor(own._id, "most_jolly")).rejects.toThrow(
      OWN_ENTRY_VOTE_MESSAGE,
    );
  });

  it("counts 2026 votes from before categories as best display", async () => {
    await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      await insertTestVote(ctx, {
        competitionId: competition._id,
        entryId: first,
        votingUserId: user._id,
        inPerson: true,
        sawInPerson: true,
        locationCheck: "ok",
        castAt: Date.now(),
      });
    });
    expect(await countFor(first, "in_person")).toBe(1);
    expect(await t.query(api.my.votes.mine, {})).toMatchObject({
      best_display: { category: "best_display", entry: { _id: first } },
      most_jolly: null,
    });

    // Changing it replaces it rather than adding a second best display vote
    await voteFor(second, "best_display");
    await voteFor(first, "most_jolly");
    expect(
      (await storedVotes(t)).map((vote) => [vote.entryId, vote.category]),
    ).toEqual([
      [second, "best_display"],
      [first, "most_jolly"],
    ]);
    expect(await countFor(first, "in_person")).toBe(0);
  });
});

describe("results", () => {
  it("ranks each prize from its own pool of votes", async () => {
    const { base, t } = await setup();
    await openVoting(t);
    const a = await createApprovedTestEntryToVoteFor(t, { name: "A" });
    const b = await createApprovedTestEntryToVoteFor(t, { name: "B" });
    const ballots = [
      { bestDisplay: a._id, inPerson: true, mostJolly: b._id },
      { bestDisplay: b._id, inPerson: false },
      { bestDisplay: b._id, inPerson: false },
      { bestDisplay: b._id, inPerson: true, mostJolly: b._id },
      { bestDisplay: a._id, inPerson: true, mostJolly: a._id },
    ];
    for (const [i, ballot] of ballots.entries()) {
      const voter = await signInAs(base, { name: `Voter ${i}` });
      await voter.mutation(api.my.votes.vote, {
        entryId: ballot.bestDisplay,
        category: "best_display",
        sawInPerson: ballot.inPerson,
        geoToken: await geoToken(busselton),
      });
      if (ballot.mostJolly)
        await voter.mutation(api.my.votes.vote, {
          entryId: ballot.mostJolly,
          category: "most_jolly",
          sawInPerson: true,
          geoToken: await geoToken(busselton),
        });
    }

    const asAdmin = await signInAs(base, { isCompetitionAdmin: true });
    const results = await asAdmin.query(
      api.admin.competition.votes.results,
      {},
    );
    const counts = (ranking: typeof results.peoplesChoice) =>
      ranking.map((row) => [row.entryId, row.votes]);

    expect(counts(results.inPersonFavourites)).toEqual([
      [a._id, 2],
      [b._id, 1],
    ]);
    // In-person best display votes don't count here too
    expect(counts(results.peoplesChoice)).toEqual([[b._id, 2]]);
    expect(counts(results.mostJolly)).toEqual([
      [b._id, 2],
      [a._id, 1],
    ]);
    expect(results.legacyBestDisplay).toEqual([]);

    expect(
      await asAdmin.query(api.admin.competition.competitions.overview, {}),
    ).toMatchObject({ votes: { inPerson: 3, online: 2, mostJolly: 3 } });
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

    expect(await t.query(api.my.votes.mine, {})).toEqual(noVotes);

    const asAdmin = await signInAs(base, { isCompetitionAdmin: true });
    const results = await asAdmin.query(api.admin.competition.votes.results, {
      competitionId: competitionIds.past,
    });
    expect(results.year).toBe(2025);
    expect(results.legacyBestDisplay).toMatchObject([
      { entryId: entry._id, votes: 1 },
    ]);
    expect(results.mostJolly).toMatchObject([{ entryId: entry._id, votes: 1 }]);
    expect(results.peoplesChoice).toEqual([]);
    expect(results.inPersonFavourites).toEqual([]);

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
      category: "best_display",
      sawInPerson: true,
      geoToken: await geoToken(busselton),
    });
    await overseas.mutation(api.my.votes.vote, {
      entryId: entry._id,
      category: "best_display",
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
      category: "best_display",
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
