// The extra dot in this file name stops Convex from deploying it: the rate
// limiter and aggregate test helpers use import.meta.glob, which the Convex
// runtime rejects.
import { convexTest } from "convex-test";
import rateLimiter from "@convex-dev/rate-limiter/test";
import aggregate from "@convex-dev/aggregate/test";
import resend from "@convex-dev/resend/test";
import { register as registerStateMachines } from "@convex-dev/state-machines/test";
import schema from "../../../schema";
import type { Doc, Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import type { WithoutSystemFields } from "convex/server";
import { ensure } from "../../../../shared/ensure";
import { getAuthUserId } from "@convex-dev/auth/server";
import { entries } from "../../entries/model";
import { competitions } from "../../competitions/model";
import { aggregateVotes } from "../../votes/lib";

export const createConvexTest = () => {
  const t = convexTest(schema);
  rateLimiter.register(t);
  aggregate.register(t, "aggregateVotes");
  resend.register(t);
  registerStateMachines(t);

  return t;
};
export type ConvexTest = ReturnType<typeof createConvexTest>;
export type AuthenticatedConvexTest = ReturnType<typeof signInAsTestUser>;
export type TestOrAuthenticatedConvexTest =
  ConvexTest | AuthenticatedConvexTest;

// Last year's competition and this year's. The newest year is current.
export const ensureTestCompetitions = async (ctx: MutationCtx) => {
  const ensureYear = async (year: number, entriesOpen: boolean) => {
    const existing = await competitions.query(ctx).forYear(year).find();
    if (existing) return existing;
    const competitionId = await ctx.db.insert("competitions", {
      year,
      entriesOpen,
      votingOpen: false,
    });
    return ensure(await ctx.db.get(competitionId));
  };
  return {
    past: await ensureYear(2025, false),
    current: await ensureYear(2026, true),
  };
};

export const createTestUser = async (
  t: ConvexTest,
  options: {
    user?: Partial<Doc<"users">>;
  } = {},
): Promise<Doc<"users">> => {
  return t.run(async (ctx) => {
    await ensureTestCompetitions(ctx);
    const userId = await ctx.db.insert("users", {
      ...options.user,
    });
    const user = await ctx.db.get(userId);
    return ensure(user);
  });
};

export const signInAsTestUser = (t: ConvexTest, user: Doc<"users">) => {
  return t.withIdentity({
    subject: user._id,
    tokenIdentifier: `test|${user._id}`,
  });
};

export const createConvexTestWithUser = async (
  user?: Doc<"users">,
): Promise<{
  t: AuthenticatedConvexTest;
  user: Doc<"users">;
}> => {
  const t = createConvexTest();

  const u = user ?? (await createTestUser(t));
  const asUser = signInAsTestUser(t, u);
  return { t: asUser, user: u };
};

export const getAllTestEntries = (t: TestOrAuthenticatedConvexTest) => {
  return t.run(async (ctx) => {
    const entries = await ctx.db.query("entries").collect();
    return entries;
  });
};

export const getTheOnlyTestEntry = async (t: TestOrAuthenticatedConvexTest) => {
  const entries = await getAllTestEntries(t);
  if (entries.length != 1) throw new Error("Expected 1 entry");
  return ensure(entries[0]);
};

export const createTestStorageId = async (
  t: TestOrAuthenticatedConvexTest,
  options: { contentType?: string; data?: BlobPart } = {},
): Promise<Id<"_storage">> => {
  const contentType = options.contentType ?? "image/jpeg";
  return t.run(async (ctx) => {
    // Starts with the JPEG magic number so the uploaded image check keeps it
    const data =
      options.data ?? new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const blob = new Blob([data], {
      type: contentType,
    });
    const storageId = await ctx.storage.store(blob);
    // convex-test doesn't record the content type like the real backend does
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ctx.db as any).patch(storageId, { contentType });
    return storageId;
  });
};

export const createTestPhotoObject = async (
  t: TestOrAuthenticatedConvexTest,
  storageId?: Id<"_storage">,
): Promise<{ storageId: Id<"_storage"> }> => {
  // Create a mock photo object for testing
  const id = storageId || (await createTestStorageId(t));
  return {
    storageId: id,
  };
};

// Puts an entry straight into a state, skipping the machine, with sensible
// defaults. `overrides` are the state's own fields.
//
// - moveEntryToStatus(t, { entryId, status: "submitted" })
// - moveEntryToStatus(t, { entryId, status: "approved", overrides: { name: "Custom Entry Name" } })
export const moveEntryToStatus = async (
  t: TestOrAuthenticatedConvexTest,
  options: {
    entryId: Id<"entries">;
    status: "draft" | "submitted" | "approved";
    overrides?: Record<string, unknown>;
  },
) => {
  const { entryId, status, overrides = {} } = options;

  return t.run(async (ctx) => {
    const currentEntry = await entries.query(ctx).forEntry(entryId).get();
    const current = currentEntry.state;

    const baseDefaults = {
      houseAddress: {
        address: "123 Main St",
        lat: 0,
        lng: 0,
        placeId: "pid-test",
      },
      name: "Test Entry",
    };
    const { houseAddress: overrideHouseAddress, ...restOverrides } = overrides;

    let state: Record<string, unknown>;

    if (status === "draft")
      state = {
        kind: "draft",
        houseAddress: {
          address: current.houseAddress?.address ?? "123 Main St",
          placeId: "pid-test",
        },
        ...(current.name === undefined ? {} : { name: current.name }),
        ...overrides,
      };
    else if (status === "submitted")
      state = {
        kind: "submitted",
        submittedAt: Date.now(),
        houseAddress: {
          ...baseDefaults.houseAddress,
          ...(overrideHouseAddress || {}),
        },
        name: baseDefaults.name,
        ...restOverrides,
      };
    else if (status === "approved")
      state = {
        kind: "approved",
        // Default to 1 second ago if it was never sent in
        submittedAt:
          "submittedAt" in current ? current.submittedAt : Date.now() - 1000,
        approvedAt: Date.now(),
        entryNumber: await entries
          .query(ctx)
          .getNextAvailableEntryNumber(currentEntry.competitionId),
        houseAddress: {
          ...baseDefaults.houseAddress,
          ...(overrideHouseAddress || {}),
        },
        name: baseDefaults.name,
        ...restOverrides,
      };
    else throw new Error(`Unknown status: ${status}`);

    await ctx.db.patch(entryId, {
      state: state as Doc<"entries">["state"],
      stateTimers: [],
    });
  });
};

// A draft by the signed in user, unless `overrides` says otherwise. It's
// inserted directly, so the machine's start (and its checks) don't run.
export const createTestEntry = async (
  t: TestOrAuthenticatedConvexTest,
  overrides: Partial<Doc<"entries">> = {},
) => {
  const user = await getTestUser(t);
  return t.run(async (ctx) => {
    const { current: competition } = await ensureTestCompetitions(ctx);
    // Create a basic draft entry first
    const entryId = await ctx.db.insert("entries", {
      competitionId: competition._id,
      submittedByUserId: user._id,
      state: { kind: "draft" },
      stateTimers: [],
    });

    // Apply any overrides if provided (excluding system fields)
    if (Object.keys(overrides).length > 0) {
      const { _id, _creationTime, ...patchData } = overrides;
      if (Object.keys(patchData).length > 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.db.patch(entryId, patchData as any);
    }

    return await entries.query(ctx).forEntry(entryId).get();
  });
};

export const getTestUser = (t: TestOrAuthenticatedConvexTest) => {
  return t.run(async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("No test user is signed in");
    const user = await ctx.db.get(userId);
    return ensure(user);
  });
};

// t.run skips the triggers, so the vote goes into the aggregate by hand, the
// same as it would through a mutation
export const insertTestVote = async (
  ctx: MutationCtx,
  vote: WithoutSystemFields<Doc<"votes">>,
) => {
  const voteId = await ctx.db.insert("votes", vote);
  await aggregateVotes.insert(ctx, ensure(await ctx.db.get(voteId)));
  return voteId;
};

// An approved entry this year from someone other than the signed in user, so
// they're allowed to vote for it
export const createApprovedTestEntryToVoteFor = async (
  t: TestOrAuthenticatedConvexTest,
  entrant: Partial<Doc<"users">> = { name: "Another Entrant" },
) => {
  const entryId = await t.run(async (ctx) => {
    const { current } = await ensureTestCompetitions(ctx);
    return await ctx.db.insert("entries", {
      competitionId: current._id,
      submittedByUserId: await ctx.db.insert("users", entrant),
      state: { kind: "draft" },
      stateTimers: [],
    });
  });
  await moveEntryToStatus(t, { entryId, status: "approved" });
  return await t.run(async (ctx) =>
    ensure(await ctx.db.get(entryId), "Test entry wasn't created"),
  );
};
