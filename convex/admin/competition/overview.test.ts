import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  createConvexTest,
  createTestUser,
  ensureTestCompetitions,
  insertTestVote,
  signInAsTestUser,
} from "../../features/common/tests/testingHelpers.vitest";
import type { ConvexTest } from "../../features/common/tests/testingHelpers.vitest";
import { competitions } from "../../features/competitions/model";
import { describeNumbers } from "../../features/entries/numbers";

const houseAddress = (placeId: string) => ({
  address: `${placeId} Keel Retreat`,
  lat: -33.633,
  lng: 115.39,
  placeId,
});

const insertEntry = (
  ctx: MutationCtx,
  entry: Partial<Doc<"entries">> & {
    competitionId: Id<"competitions">;
    submittedByUserId: Id<"users">;
    status: Doc<"entries">["status"];
  },
) =>
  ctx.db.insert("entries", {
    submittedAt: Date.now(),
    name: "Twinkle Town",
    houseAddress: houseAddress("pid"),
    ...entry,
  } as Doc<"entries">);

const asAdmin = async (t: ConvexTest, user: Partial<Doc<"users">> = {}) => {
  const admin = await createTestUser(t, {
    user: { isCompetitionAdmin: true, ...user },
  });
  return { admin, asAdmin: signInAsTestUser(t, admin) };
};

const getCompetition = (t: ConvexTest) =>
  t.run(async (ctx) => await competitions.query(ctx).current());

describe("admin overview", () => {
  it("counts entries by status and votes in person and in total", async () => {
    const t = createConvexTest();
    const { asAdmin: admin } = await asAdmin(t);
    await t.run(async (ctx) => {
      const { current } = await ensureTestCompetitions(ctx);
      const user = () => ctx.db.insert("users", {});
      const approvedId = await insertEntry(ctx, {
        competitionId: current._id,
        submittedByUserId: await user(),
        status: "approved",
        approvedAt: Date.now(),
        entryNumber: 1,
      });
      await insertEntry(ctx, {
        competitionId: current._id,
        submittedByUserId: await user(),
        status: "submitted",
        houseAddress: houseAddress("b"),
      });
      await ctx.db.insert("entries", {
        competitionId: current._id,
        submittedByUserId: await user(),
        status: "draft",
      });
      for (const inPerson of [true, false, false])
        await insertTestVote(ctx, {
          competitionId: current._id,
          entryId: approvedId,
          votingUserId: await user(),
          inPerson,
          sawInPerson: inPerson,
          locationCheck: "ok",
          castAt: Date.now(),
        });
    });

    expect(
      await admin.query(api.admin.competition.competitions.overview, {}),
    ).toMatchObject({
      year: 2026,
      entriesOpen: true,
      votingOpen: false,
      entries: {
        totalSubmittedEntries: 1,
        totalApprovedEntries: 1,
        totalRejectedEntries: 0,
        totalUnsentEntries: 1,
      },
      votes: { inPerson: 1, total: 3 },
    });
  });

  it("opens and closes entries and voting", async () => {
    const t = createConvexTest();
    const { asAdmin: admin } = await asAdmin(t);

    await admin.mutation(api.admin.competition.competitions.setEntriesOpen, {
      open: false,
    });
    await admin.mutation(api.admin.competition.competitions.setVotingOpen, {
      open: true,
    });

    expect(await getCompetition(t)).toMatchObject({
      entriesOpen: false,
      votingOpen: true,
    });
  });

  it("won't let people who aren't admins open voting", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);

    await expect(
      signInAsTestUser(t, user).mutation(
        api.admin.competition.competitions.setVotingOpen,
        { open: true },
      ),
    ).rejects.toThrow("permission");
    expect((await getCompetition(t)).votingOpen).toBe(false);
  });
});

describe("admin entry review", () => {
  it("flags another entry at the same address and a returning entrant's lost number", async () => {
    const t = createConvexTest();
    const { asAdmin: admin } = await asAdmin(t);
    const { entryId, holderId, sameAddressId } = await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      const entrantId = await ctx.db.insert("users", {});
      const previousId = await insertEntry(ctx, {
        competitionId: past._id,
        submittedByUserId: entrantId,
        status: "approved",
        approvedAt: Date.now(),
        entryNumber: 7,
      });
      const holderId = await insertEntry(ctx, {
        competitionId: current._id,
        submittedByUserId: await ctx.db.insert("users", {}),
        status: "approved",
        approvedAt: Date.now(),
        entryNumber: 7,
        name: "Number Seven",
        houseAddress: houseAddress("other"),
      });
      const sameAddressId = await insertEntry(ctx, {
        competitionId: current._id,
        submittedByUserId: await ctx.db.insert("users", {}),
        status: "submitted",
        name: "Next Door",
        houseAddress: houseAddress("shared"),
      });
      const entryId = await insertEntry(ctx, {
        competitionId: current._id,
        submittedByUserId: entrantId,
        previousEntryId: previousId,
        status: "submitted",
        houseAddress: houseAddress("shared"),
      });
      return { entryId, holderId, sameAddressId };
    });

    const queue = await admin.query(api.admin.competition.entries.list, {
      status: "submitted",
    });
    expect(queue.find((entry) => entry._id === entryId)?.checks).toEqual({
      isWithinBoundary: true,
      location: { lat: -33.633, lng: 115.39 },
      sameAddress: [{ _id: sameAddressId, name: "Next Door" }],
      previousNumberHeldBy: { _id: holderId, name: "Number Seven" },
    });
  });

  it("lists every entry this year, drafts included", async () => {
    const t = createConvexTest();
    const { asAdmin: admin } = await asAdmin(t);
    await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      await ctx.db.insert("entries", {
        competitionId: current._id,
        submittedByUserId: await ctx.db.insert("users", { name: "Holly" }),
        status: "draft",
        name: "Half Done",
      });
      await insertEntry(ctx, {
        competitionId: past._id,
        submittedByUserId: await ctx.db.insert("users", {}),
        status: "approved",
        approvedAt: Date.now(),
        entryNumber: 3,
      });
    });

    expect(
      await admin.query(api.admin.competition.entries.listAll, {}),
    ).toEqual([
      expect.objectContaining({
        status: "draft",
        name: "Half Done",
        submitterName: "Holly",
        previous: null,
      }),
    ]);
  });

  it("shows the person's entries from earlier years on the entry", async () => {
    const t = createConvexTest();
    const { asAdmin: admin } = await asAdmin(t);
    const entryId = await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      const entrantId = await ctx.db.insert("users", { email: "e@x.com" });
      await insertEntry(ctx, {
        competitionId: past._id,
        submittedByUserId: entrantId,
        status: "approved",
        approvedAt: Date.now(),
        entryNumber: 12,
        name: "Last Year",
      });
      return await insertEntry(ctx, {
        competitionId: current._id,
        submittedByUserId: entrantId,
        status: "submitted",
      });
    });

    expect(
      await admin.query(api.admin.competition.entries.get, { entryId }),
    ).toMatchObject({
      year: 2026,
      isCurrent: true,
      submitter: { email: "e@x.com" },
      previous: { year: 2025, entryNumber: 12, name: "Last Year" },
      earlierEntries: [
        { year: 2025, name: "Last Year", status: "approved", entryNumber: 12 },
      ],
    });
  });

  it("sends a rejected entry back for review without its old number", async () => {
    const t = createConvexTest();
    const { asAdmin: admin } = await asAdmin(t);
    const { rejectedId, approvedId } = await t.run(async (ctx) => {
      const { current } = await ensureTestCompetitions(ctx);
      const rejectedId = await insertEntry(ctx, {
        competitionId: current._id,
        submittedByUserId: await ctx.db.insert("users", {}),
        status: "rejected",
        rejectedAt: Date.now(),
        rejectedReason: "Photos don't show the lights",
        entryNumber: 5,
      });
      const approvedId = await insertEntry(ctx, {
        competitionId: current._id,
        submittedByUserId: await ctx.db.insert("users", {}),
        status: "approved",
        approvedAt: Date.now(),
        entryNumber: 6,
        houseAddress: houseAddress("b"),
      });
      return { rejectedId, approvedId };
    });

    await admin.mutation(api.admin.competition.entries.reopen, {
      entryId: rejectedId,
    });
    const reopened = await t.run((ctx) => ctx.db.get(rejectedId));
    expect(reopened).toMatchObject({
      status: "submitted",
      name: "Twinkle Town",
    });
    expect(reopened).not.toHaveProperty("rejectedReason");
    expect(reopened).not.toHaveProperty("entryNumber");

    await expect(
      admin.mutation(api.admin.competition.entries.reopen, {
        entryId: approvedId,
      }),
    ).rejects.toThrow("Only rejected entries");
  });
});

describe("admin numbers", () => {
  it("shows used, kept and free numbers, and flags ones without a sign", async () => {
    const t = createConvexTest();
    const { asAdmin: admin } = await asAdmin(t);
    const { heldId } = await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      await ctx.db.patch(current._id, { entryNumberMin: 1, entryNumberMax: 3 });
      await insertEntry(ctx, {
        competitionId: past._id,
        submittedByUserId: await ctx.db.insert("users", {
          email: "back@x.com",
        }),
        status: "approved",
        approvedAt: Date.now(),
        entryNumber: 2,
        name: "Coming Back",
      });
      const heldId = await insertEntry(ctx, {
        competitionId: current._id,
        submittedByUserId: await ctx.db.insert("users", {}),
        status: "approved",
        approvedAt: Date.now(),
        entryNumber: 40,
        name: "Old Number",
      });
      return { heldId };
    });

    const { numbers } = await admin.query(api.admin.competition.numbers.list);
    expect(numbers).toEqual([
      { entryNumber: 1, isOutsideRange: false },
      {
        entryNumber: 2,
        isOutsideRange: false,
        reservedFor: { name: "Coming Back", year: 2025, email: "back@x.com" },
      },
      { entryNumber: 3, isOutsideRange: false },
      {
        entryNumber: 40,
        isOutsideRange: true,
        holder: { entryId: heldId, name: "Old Number", status: "approved" },
      },
    ]);

    await admin.mutation(api.admin.competition.competitions.setEntriesOpen, {
      open: false,
    });
    const closed = await admin.query(api.admin.competition.numbers.list);
    expect(closed.numbers[1]).toEqual({
      entryNumber: 2,
      isOutsideRange: false,
    });
  });

  it("puts a number used this year ahead of last year's reservation", () => {
    expect(
      describeNumbers({
        range: { min: 1, max: 1 },
        holders: new Map([[1, "this year"]]),
        reserved: new Map([[1, "last year"]]),
      }),
    ).toEqual([{ entryNumber: 1, holder: "this year", isOutsideRange: false }]);
  });
});

describe("admin people", () => {
  it("lets competition admins add other admins but not remove themselves", async () => {
    const t = createConvexTest();
    const { admin, asAdmin: asZaran } = await asAdmin(t, {
      name: "Zaran",
      email: "zoliver@aigleroyal.com.au",
    });
    const tracy = await createTestUser(t, {
      user: { name: "Tracy", email: "tjulian@aigleroyal.com.au" },
    });

    await asZaran.mutation(api.admin.competition.users.setCompetitionAdmin, {
      userId: tracy._id,
      enabled: true,
    });
    expect(
      (await asZaran.query(api.admin.competition.users.listAdmins, {})).map(
        (person) => person.name,
      ),
    ).toEqual(expect.arrayContaining(["Zaran", "Tracy"]));

    await expect(
      asZaran.mutation(api.admin.competition.users.setCompetitionAdmin, {
        userId: admin._id,
        enabled: false,
      }),
    ).rejects.toThrow("your own admin access");
  });

  it("finds people by name or email", async () => {
    const t = createConvexTest();
    // convex-test's search trips over users without a name or email
    const { asAdmin: admin } = await asAdmin(t, {
      name: "Admin",
      email: "admin@example.com",
    });
    await createTestUser(t, {
      user: { name: "Holly Ivy", email: "holly@example.com" },
    });
    await createTestUser(t, {
      user: { name: "Rudolph", email: "rudolph@north.pole" },
    });

    const search = (text: string) =>
      admin.query(api.admin.competition.users.search, { text });
    expect((await search("Holly")).map((person) => person.name)).toEqual([
      "Holly Ivy",
    ]);
    expect((await search("rudolph@north.pole")).map((p) => p.name)).toEqual([
      "Rudolph",
    ]);
    expect(await search("  ")).toEqual([]);
  });
});
