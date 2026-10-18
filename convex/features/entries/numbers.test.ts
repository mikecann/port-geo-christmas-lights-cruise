import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import {
  createConvexTest,
  createTestUser,
  ensureTestCompetitions,
  signInAsTestUser,
} from "../common/tests/testingHelpers.vitest";
import type { ConvexTest } from "../common/tests/testingHelpers.vitest";
import { linkReturningEntrantsForContext } from "../../internal/entries";
import { email } from "../email/model";
import { entries } from "./model";
import {
  ensureValidEntryNumberRange,
  isOutsideRange,
  pickEntryNumber,
} from "./numbers";

const houseAddress = (placeId: string) => ({
  address: `${placeId} Keel Retreat`,
  lat: -33.633,
  lng: 115.39,
  placeId,
});

const insertUser = (ctx: MutationCtx) => ctx.db.insert("users", {});

const insertApproved = (
  ctx: MutationCtx,
  args: {
    competitionId: Id<"competitions">;
    userId: Id<"users">;
    entryNumber: number;
    name?: string;
  },
) =>
  ctx.db.insert("entries", {
    competitionId: args.competitionId,
    submittedByUserId: args.userId,
    status: "approved",
    submittedAt: Date.now(),
    approvedAt: Date.now(),
    entryNumber: args.entryNumber,
    name: args.name ?? `Display ${args.entryNumber}`,
    houseAddress: houseAddress(`${args.competitionId}-${args.entryNumber}`),
  });

const insertSubmitted = (
  ctx: MutationCtx,
  args: { competitionId: Id<"competitions">; userId: Id<"users"> },
) =>
  ctx.db.insert("entries", {
    competitionId: args.competitionId,
    submittedByUserId: args.userId,
    status: "submitted",
    submittedAt: Date.now(),
    name: "This year",
    houseAddress: houseAddress(`submitted-${args.userId}`),
  });

const approve = (t: ConvexTest, entryId: Id<"entries">) =>
  t.run((ctx) => entries.mutate(ctx).forEntry(entryId).approve());

const getEntry = (t: ConvexTest, entryId: Id<"entries">) =>
  t.run((ctx) => entries.query(ctx).forEntry(entryId).get());

const signInAsAdmin = async (t: ConvexTest) =>
  signInAsTestUser(
    t,
    await createTestUser(t, { user: { isCompetitionAdmin: true } }),
  );

// Fills the current competition's numbers in the range, apart from `except`
const fillRange = async (
  ctx: MutationCtx,
  competitionId: Id<"competitions">,
  range: { min: number; max: number },
  except: number[] = [],
) => {
  for (let n = range.min; n <= range.max; n++)
    if (!except.includes(n))
      await insertApproved(ctx, {
        competitionId,
        userId: await insertUser(ctx),
        entryNumber: n,
      });
};

describe("pickEntryNumber", () => {
  it("picks a free number inside the range", () => {
    for (let i = 0; i < 20; i++) {
      const n = pickEntryNumber({ min: 1, max: 5 }, new Set([1, 2, 4]));
      expect([3, 5]).toContain(n);
    }
  });

  it("uses the lowest free number above the range once it's full", () => {
    expect(pickEntryNumber({ min: 1, max: 3 }, new Set([1, 2, 3]))).toBe(4);
    expect(pickEntryNumber({ min: 1, max: 3 }, new Set([1, 2, 3, 4, 6]))).toBe(
      5,
    );
  });

  it("flags numbers outside the range", () => {
    expect(isOutsideRange(0, { min: 1, max: 60 })).toBe(true);
    expect(isOutsideRange(1, { min: 1, max: 60 })).toBe(false);
    expect(isOutsideRange(60, { min: 1, max: 60 })).toBe(false);
    expect(isOutsideRange(61, { min: 1, max: 60 })).toBe(true);
  });

  it("rejects ranges that don't make sense", () => {
    expect(() => ensureValidEntryNumberRange({ min: 10, max: 5 })).toThrow(
      "no bigger than",
    );
    expect(() => ensureValidEntryNumberRange({ min: 1.5, max: 5 })).toThrow(
      "whole numbers",
    );
    expect(() => ensureValidEntryNumberRange({ min: -1, max: 5 })).toThrow(
      "whole numbers",
    );
  });
});

describe("new entrant numbers", () => {
  it("are drawn from 1 to 60 by default", async () => {
    const t = createConvexTest();
    const entryIds = await t.run(async (ctx) => {
      const { current } = await ensureTestCompetitions(ctx);
      const ids = [];
      for (let i = 0; i < 10; i++)
        ids.push(
          await insertSubmitted(ctx, {
            competitionId: current._id,
            userId: await insertUser(ctx),
          }),
        );
      return ids;
    });

    const numbers = [];
    for (const entryId of entryIds) numbers.push(await approve(t, entryId));

    expect(new Set(numbers).size).toBe(numbers.length);
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(60);
    }
  });

  it("are drawn from the competition's own range", async () => {
    const t = createConvexTest();
    const entryId = await t.run(async (ctx) => {
      const { current } = await ensureTestCompetitions(ctx);
      await ctx.db.patch(current._id, { entryNumberMin: 7, entryNumberMax: 8 });
      await insertApproved(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
        entryNumber: 7,
      });
      return await insertSubmitted(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
      });
    });

    expect(await approve(t, entryId)).toBe(8);
  });

  it("never get a number reserved for last year's entrant while entries are open", async () => {
    const t = createConvexTest();
    const entryId = await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      await ctx.db.patch(current._id, { entryNumberMin: 1, entryNumberMax: 3 });
      await insertApproved(ctx, {
        competitionId: past._id,
        userId: await insertUser(ctx),
        entryNumber: 2,
      });
      await fillRange(ctx, current._id, { min: 1, max: 3 }, [2]);
      return await insertSubmitted(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
      });
    });

    expect(await approve(t, entryId)).toBe(4);
  });

  it("can get an unclaimed reserved number once entries close", async () => {
    const t = createConvexTest();
    const entryId = await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      await ctx.db.patch(current._id, {
        entryNumberMin: 1,
        entryNumberMax: 3,
        entriesOpen: false,
      });
      await insertApproved(ctx, {
        competitionId: past._id,
        userId: await insertUser(ctx),
        entryNumber: 2,
      });
      await fillRange(ctx, current._id, { min: 1, max: 3 }, [2]);
      return await insertSubmitted(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
      });
    });

    expect(await approve(t, entryId)).toBe(2);
  });

  it("go above the range when it's full, and admins see it flagged", async () => {
    const t = createConvexTest();
    const entryId = await t.run(async (ctx) => {
      const { current } = await ensureTestCompetitions(ctx);
      await ctx.db.patch(current._id, { entryNumberMin: 1, entryNumberMax: 3 });
      await fillRange(ctx, current._id, { min: 1, max: 3 });
      return await insertSubmitted(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
      });
    });

    expect(await approve(t, entryId)).toBe(4);
    const approved = await (
      await signInAsAdmin(t)
    ).query(api.admin.competition.entries.list, { status: "approved" });
    expect(
      approved.map((entry) => [entry.entryNumber, entry.isNumberOutsideRange]),
    ).toEqual(
      expect.arrayContaining([
        [3, false],
        [4, true],
      ]),
    );
  });

  it("don't count numbers on rejected entries as taken", async () => {
    const t = createConvexTest();
    const entryId = await t.run(async (ctx) => {
      const { current } = await ensureTestCompetitions(ctx);
      await ctx.db.patch(current._id, { entryNumberMin: 1, entryNumberMax: 2 });
      await insertApproved(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
        entryNumber: 1,
      });
      await ctx.db.insert("entries", {
        competitionId: current._id,
        submittedByUserId: await insertUser(ctx),
        status: "rejected",
        submittedAt: Date.now(),
        rejectedAt: Date.now(),
        rejectedReason: "Outside the area",
        entryNumber: 2,
        name: "Rejected",
        houseAddress: houseAddress("rejected"),
      });
      return await insertSubmitted(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
      });
    });

    expect(await approve(t, entryId)).toBe(2);
  });
});

describe("returning entrants", () => {
  const setUpReturning = async (
    t: ConvexTest,
    options: { entryNumber?: number } = {},
  ) => {
    const user = await createTestUser(t);
    const previousEntryId = await t.run(async (ctx) => {
      const { past } = await ensureTestCompetitions(ctx);
      const id = await insertApproved(ctx, {
        competitionId: past._id,
        userId: user._id,
        entryNumber: options.entryNumber ?? 26,
        name: "Candy Cane Lane",
      });
      await ctx.db.insert("photos", {
        entryId: id,
        kind: "mock",
        mockPath: "1.jpg",
      });
      return id;
    });
    return { user, previousEntryId, asUser: signInAsTestUser(t, user) };
  };

  it("start with last year's name, address and number, but no photos", async () => {
    const t = createConvexTest();
    const { asUser, previousEntryId } = await setUpReturning(t);

    await asUser.mutation(api.my.entries.enter, {});

    const entry = await asUser.query(api.my.entries.find, {});
    expect(entry).toMatchObject({
      status: "draft",
      previousEntryId,
      name: "Candy Cane Lane",
      entryNumber: 26,
      houseAddress: {
        address: expect.stringContaining("Keel Retreat"),
        placeId: expect.any(String),
      },
    });
    expect(await asUser.query(api.my.photos.list, {})).toEqual([]);
  });

  it("keep their number through approval", async () => {
    const t = createConvexTest();
    const { asUser } = await setUpReturning(t);
    await asUser.mutation(api.my.entries.enter, {});
    const entry = await asUser.query(api.my.entries.find, {});
    if (!entry) throw new Error("No entry");
    await t.run(async (ctx) => {
      await ctx.db.patch(entry._id, {
        status: "submitted",
        submittedAt: Date.now(),
        name: "Candy Cane Lane",
        houseAddress: houseAddress("this-year"),
      });
    });

    await (
      await signInAsAdmin(t)
    ).mutation(api.admin.competition.entries.approve, { entryId: entry._id });

    expect(await getEntry(t, entry._id)).toMatchObject({
      status: "approved",
      entryNumber: 26,
    });
  });

  it("keep their number even when it's outside the range, flagged for admins", async () => {
    const t = createConvexTest();
    const { asUser } = await setUpReturning(t, { entryNumber: 0 });
    await asUser.mutation(api.my.entries.enter, {});
    const entry = await asUser.query(api.my.entries.find, {});
    if (!entry) throw new Error("No entry");
    await t.run((ctx) =>
      ctx.db.patch(entry._id, {
        status: "submitted",
        submittedAt: Date.now(),
        name: "Candy Cane Lane",
        houseAddress: houseAddress("this-year"),
      }),
    );

    const [listed] = await (
      await signInAsAdmin(t)
    ).query(api.admin.competition.entries.list, { status: "submitted" });
    expect(listed).toMatchObject({
      entryNumber: 0,
      isNumberOutsideRange: true,
      previous: { year: 2025, entryNumber: 0, name: "Candy Cane Lane" },
    });
  });

  it("don't reserve a number another entry already holds", async () => {
    const t = createConvexTest();
    const { asUser } = await setUpReturning(t);
    await t.run(async (ctx) => {
      const { current } = await ensureTestCompetitions(ctx);
      await insertApproved(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
        entryNumber: 26,
      });
    });

    await asUser.mutation(api.my.entries.enter, {});

    const entry = await asUser.query(api.my.entries.find, {});
    expect(entry?.previousEntryId).toBeDefined();
    expect(entry?.entryNumber).toBeUndefined();
  });

  it("get their number back from a year they skipped, if nobody had it last year", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);
    await t.run(async (ctx) => {
      const older = await ctx.db.insert("competitions", {
        year: 2024,
        entriesOpen: false,
        votingOpen: false,
      });
      await insertApproved(ctx, {
        competitionId: older,
        userId: user._id,
        entryNumber: 17,
      });
    });
    const asUser = signInAsTestUser(t, user);

    await asUser.mutation(api.my.entries.enter, {});

    expect(await asUser.query(api.my.entries.find, {})).toMatchObject({
      entryNumber: 17,
    });
  });

  it("don't take a skipped year's number from whoever had it last year", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);
    await t.run(async (ctx) => {
      const { past } = await ensureTestCompetitions(ctx);
      const older = await ctx.db.insert("competitions", {
        year: 2024,
        entriesOpen: false,
        votingOpen: false,
      });
      await insertApproved(ctx, {
        competitionId: older,
        userId: user._id,
        entryNumber: 17,
      });
      await insertApproved(ctx, {
        competitionId: past._id,
        userId: await insertUser(ctx),
        entryNumber: 17,
      });
    });
    const asUser = signInAsTestUser(t, user);

    await asUser.mutation(api.my.entries.enter, {});

    const entry = await asUser.query(api.my.entries.find, {});
    expect(entry?.previousEntryId).toBeDefined();
    expect(entry?.entryNumber).toBeUndefined();
  });

  it("see their previous entry with its photos", async () => {
    const t = createConvexTest();
    const { asUser, previousEntryId } = await setUpReturning(t);

    const beforeEntering = await asUser.query(api.my.entries.findPrevious, {});
    await asUser.mutation(api.my.entries.enter, {});
    const afterEntering = await asUser.query(api.my.entries.findPrevious, {});

    for (const previous of [beforeEntering, afterEntering])
      expect(previous).toMatchObject({
        year: 2025,
        entry: {
          _id: previousEntryId,
          name: "Candy Cane Lane",
          entryNumber: 26,
          address: expect.stringContaining("Keel Retreat"),
        },
        photos: [expect.objectContaining({ mockPath: "1.jpg" })],
      });
  });

  it("isn't shown to first-time entrants", async () => {
    const t = createConvexTest();
    const asUser = signInAsTestUser(t, await createTestUser(t));

    expect(await asUser.query(api.my.entries.findPrevious, {})).toBeNull();
  });
});

describe("entries started before the link existed", () => {
  const setUp = async (t: ConvexTest) =>
    await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      const userId = await insertUser(ctx);
      const previousEntryId = await insertApproved(ctx, {
        competitionId: past._id,
        userId,
        entryNumber: 26,
      });
      const entryId = await insertSubmitted(ctx, {
        competitionId: current._id,
        userId,
      });
      return { previousEntryId, entryId };
    });

  it("still keep the person's number on approval", async () => {
    const t = createConvexTest();
    const { entryId } = await setUp(t);

    expect(await approve(t, entryId)).toBe(26);
  });

  it("get linked and their number reserved by the backfill", async () => {
    const t = createConvexTest();
    const { entryId, previousEntryId } = await setUp(t);

    const result = await t.run(linkReturningEntrantsForContext);

    expect(result).toEqual({ linkedCount: 1 });
    expect(await getEntry(t, entryId)).toMatchObject({
      previousEntryId,
      entryNumber: 26,
    });
  });
});

describe("admin number tools", () => {
  it("override an entry's number, keeping numbers unique", async () => {
    const t = createConvexTest();
    const { entryId, otherEntryId } = await t.run(async (ctx) => {
      const { current } = await ensureTestCompetitions(ctx);
      return {
        entryId: await insertSubmitted(ctx, {
          competitionId: current._id,
          userId: await insertUser(ctx),
        }),
        otherEntryId: await insertApproved(ctx, {
          competitionId: current._id,
          userId: await insertUser(ctx),
          entryNumber: 5,
        }),
      };
    });
    const admin = await signInAsAdmin(t);

    await expect(
      admin.mutation(api.admin.competition.entries.setEntryNumber, {
        entryId,
        entryNumber: 5,
      }),
    ).rejects.toThrow("already used");
    await admin.mutation(api.admin.competition.entries.setEntryNumber, {
      entryId,
      entryNumber: 61,
    });
    await admin.mutation(api.admin.competition.entries.setEntryNumber, {
      entryId: otherEntryId,
      entryNumber: 5,
    });

    expect((await getEntry(t, entryId)).entryNumber).toBe(61);
    expect(await approve(t, entryId)).toBe(61);
  });

  it("can't change entries from past competitions", async () => {
    const t = createConvexTest();
    const pastEntryId = await t.run(async (ctx) => {
      const { past } = await ensureTestCompetitions(ctx);
      return await insertApproved(ctx, {
        competitionId: past._id,
        userId: await insertUser(ctx),
        entryNumber: 3,
      });
    });

    await expect(
      (await signInAsAdmin(t)).mutation(
        api.admin.competition.entries.setEntryNumber,
        { entryId: pastEntryId, entryNumber: 4 },
      ),
    ).rejects.toThrow("kept as history");
  });

  it("aren't available to entrants", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);
    const entryId = await t.run(async (ctx) =>
      insertSubmitted(ctx, {
        competitionId: (await ensureTestCompetitions(ctx)).current._id,
        userId: user._id,
      }),
    );
    const asUser = signInAsTestUser(t, user);

    await expect(
      asUser.mutation(api.admin.competition.entries.setEntryNumber, {
        entryId,
        entryNumber: 1,
      }),
    ).rejects.toThrow("permission");
    await expect(
      asUser.mutation(api.admin.competition.competitions.setEntryNumberRange, {
        min: 1,
        max: 2,
      }),
    ).rejects.toThrow("permission");
  });

  it("link an entry to a previous one, which gives it that number", async () => {
    const t = createConvexTest();
    const { entryId, previousEntryId } = await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      return {
        previousEntryId: await insertApproved(ctx, {
          competitionId: past._id,
          userId: await insertUser(ctx),
          entryNumber: 26,
        }),
        entryId: await insertSubmitted(ctx, {
          competitionId: current._id,
          userId: await insertUser(ctx),
        }),
      };
    });
    const admin = await signInAsAdmin(t);

    const linkable = await admin.query(
      api.admin.competition.entries.listLinkablePreviousEntries,
      {},
    );
    expect(linkable).toEqual([
      expect.objectContaining({
        _id: previousEntryId,
        year: 2025,
        entryNumber: 26,
      }),
    ]);

    await admin.mutation(api.admin.competition.entries.linkPreviousEntry, {
      entryId,
      previousEntryId,
    });

    expect(await getEntry(t, entryId)).toMatchObject({
      previousEntryId,
      entryNumber: 26,
    });
    expect(
      await admin.query(api.admin.competition.entries.get, { entryId }),
    ).toMatchObject({ previous: { _id: previousEntryId, entryNumber: 26 } });
    expect(await approve(t, entryId)).toBe(26);
  });

  it("won't link to an entry that wasn't approved in an earlier year, or whose number is taken", async () => {
    const t = createConvexTest();
    const ids = await t.run(async (ctx) => {
      const { past, current } = await ensureTestCompetitions(ctx);
      const sameYearId = await insertApproved(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
        entryNumber: 9,
      });
      const pastId = await insertApproved(ctx, {
        competitionId: past._id,
        userId: await insertUser(ctx),
        entryNumber: 9,
      });
      const rejectedId = await ctx.db.insert("entries", {
        competitionId: past._id,
        submittedByUserId: await insertUser(ctx),
        status: "rejected",
        submittedAt: Date.now(),
        rejectedAt: Date.now(),
        rejectedReason: "Outside the area",
        name: "Rejected",
        houseAddress: houseAddress("past-rejected"),
      });
      const entryId = await insertSubmitted(ctx, {
        competitionId: current._id,
        userId: await insertUser(ctx),
      });
      return { sameYearId, pastId, rejectedId, entryId };
    });
    const admin = await signInAsAdmin(t);
    const link = (previousEntryId: Id<"entries">) =>
      admin.mutation(api.admin.competition.entries.linkPreviousEntry, {
        entryId: ids.entryId,
        previousEntryId,
      });

    await expect(link(ids.sameYearId)).rejects.toThrow("earlier year");
    await expect(link(ids.rejectedId)).rejects.toThrow("earlier year");
    await expect(link(ids.pastId)).rejects.toThrow("already used");
    expect((await getEntry(t, ids.entryId)).previousEntryId).toBeUndefined();
  });

  it("set the competition's number range", async () => {
    const t = createConvexTest();
    const admin = await signInAsAdmin(t);

    expect(
      await admin.query(api.admin.competition.competitions.getEntryNumberRange),
    ).toEqual({ min: 1, max: 60 });
    await admin.mutation(
      api.admin.competition.competitions.setEntryNumberRange,
      { min: 0, max: 80 },
    );
    expect(
      await admin.query(api.admin.competition.competitions.getEntryNumberRange),
    ).toEqual({ min: 0, max: 80 });
    await expect(
      admin.mutation(api.admin.competition.competitions.setEntryNumberRange, {
        min: 50,
        max: 40,
      }),
    ).rejects.toThrow("no bigger than");
  });
});

describe("admin new entry email", () => {
  it("shows a returning entrant's reserved number", () => {
    const draft = (entryNumber?: number) =>
      ({
        status: "draft",
        name: "Candy Cane Lane",
        houseAddress: { address: "1 Keel Retreat", placeId: "pid" },
        entryNumber,
      }) as Doc<"entries">;

    expect(email.newEntryNotificationHtml({ entry: draft(26) })).toContain(
      "Reserved entry number:</strong> 26",
    );
    expect(
      email.newEntryNotificationHtml({ entry: draft(undefined) }),
    ).not.toContain("Reserved entry number");
  });
});
