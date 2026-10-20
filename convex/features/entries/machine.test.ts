import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { advance, asInternal } from "@convex-dev/state-machines/test";
import { api, internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import {
  createConvexTest,
  createTestUser,
  ensureTestCompetitions,
  signInAsTestUser,
} from "../common/tests/testingHelpers.vitest";
import type { ConvexTest } from "../common/tests/testingHelpers.vitest";
import { entry, machines } from "../../machines";
import { SUBMITTING_TIMEOUT_MS } from "./machine";
import { ensure } from "../../../shared/ensure";

const inside = { latitude: -33.633, longitude: 115.39 };

// Answers Google Place Details with the place the entrant picked
const stubGooglePlaces = () =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        id: decodeURIComponent(url.split("/places/")[1] ?? ""),
        location: inside,
      }),
    })),
  );

const getEntry = (t: ConvexTest, entryId: Id<"entries">) =>
  t.run(async (ctx) => ensure(await ctx.db.get(entryId)));

const findEntryOf = (t: ConvexTest, userId: Id<"users">) =>
  t.run(async (ctx) => {
    const { current } = await ensureTestCompetitions(ctx);
    return ensure(
      await ctx.db
        .query("entries")
        .withIndex("by_competitionId_and_submittedByUserId", (q) =>
          q.eq("competitionId", current._id).eq("submittedByUserId", userId),
        )
        .unique(),
    );
  });

// Signs up an entrant and starts their draft through the app's endpoints
const startEntry = async (
  t: ConvexTest,
  draft: { name: string; address: string; placeId: string },
) => {
  const user = await createTestUser(t, { user: { name: draft.name } });
  const asEntrant = signInAsTestUser(t, user);
  await asEntrant.mutation(api.my.entries.enter, {});
  await asEntrant.mutation(api.my.entries.updateDraft, {
    name: draft.name,
    houseAddress: { address: draft.address, placeId: draft.placeId },
  });
  const { _id } = await findEntryOf(t, user._id);
  return { user, asEntrant, entryId: _id };
};

const historyOf = (t: ConvexTest, entryId: Id<"entries">) =>
  t.run(async (ctx) =>
    (
      await entry.history(ctx, entryId, {
        paginationOpts: { numItems: 100, cursor: null },
      })
    ).page.map(({ event, from, to, by }) => `${from} ${event} ${to} by ${by}`),
  );

describe("the entry machine", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
    stubGooglePlaces();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("takes an entry from draft through review to approved", async () => {
    const t = createConvexTest();
    const { asEntrant, entryId } = await startEntry(t, {
      name: "Twinkle Town",
      address: "35 Keel Retreat",
      placeId: "keel-35",
    });
    expect((await getEntry(t, entryId)).state).toEqual({
      kind: "draft",
      name: "Twinkle Town",
      houseAddress: { address: "35 Keel Retreat", placeId: "keel-35" },
    });

    await asEntrant.action(api.my.entries.submit, {});
    expect((await getEntry(t, entryId)).state).toMatchObject({
      kind: "submitted",
      houseAddress: { placeId: "keel-35", lat: inside.latitude },
    });

    const admin = await createTestUser(t, {
      user: { isCompetitionAdmin: true },
    });
    const asAdmin = signInAsTestUser(t, admin);
    await asAdmin.mutation(api.admin.competition.entries.reject, {
      entryId,
      rejectedReason: "No lights in the photo",
    });
    expect((await getEntry(t, entryId)).state).toMatchObject({
      kind: "rejected",
      rejectedReason: "No lights in the photo",
    });

    await asAdmin.mutation(api.admin.competition.entries.reopen, { entryId });
    await asAdmin.mutation(api.admin.competition.entries.approve, { entryId });
    const approved = (await getEntry(t, entryId)).state;
    expect(approved).toMatchObject({ kind: "approved", name: "Twinkle Town" });
    expect(approved.entryNumber).toEqual(expect.any(Number));

    await asEntrant.mutation(api.my.entries.updateApproved, {
      name: "Twinkle Town Too",
    });
    expect((await getEntry(t, entryId)).state.name).toBe("Twinkle Town Too");

    expect(await historyOf(t, entryId)).toEqual([
      "start ENTER draft by owner",
      "draft EDIT draft by owner",
      "draft SUBMIT submitting by owner",
      "submitting GEOCODED submitted by server",
      "submitted REJECT rejected by admin",
      "rejected REOPEN submitted by admin",
      "submitted APPROVE approved by admin",
      "approved RENAME approved by owner",
    ]);
  });

  it("goes back to draft when the address can't be found", async () => {
    const t = createConvexTest();
    const { asEntrant, entryId } = await startEntry(t, {
      name: "Lost House",
      address: "Nowhere",
      placeId: "missing",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );

    await expect(asEntrant.action(api.my.entries.submit, {})).rejects.toThrow(
      'Unable to find your address "Nowhere"',
    );

    const current = await getEntry(t, entryId);
    expect(current.state.kind).toBe("draft");
    expect(current.stateTimers).toEqual([]);
    expect(await historyOf(t, entryId)).toContain(
      "submitting SUBMIT_FAILED draft by server",
    );
  });

  describe("roles", () => {
    it("won't let the entrant approve their own entry", async () => {
      const t = createConvexTest();
      const { user, asEntrant, entryId } = await startEntry(t, {
        name: "Self Approved",
        address: "1 Plover Court",
        placeId: "plover-1",
      });
      await asEntrant.action(api.my.entries.submit, {});

      const result = await asEntrant.run((ctx) =>
        entry.send(ctx, entryId, { type: "APPROVE" }),
      );

      expect(result).toEqual({
        status: "rejected",
        code: "NOT_ALLOWED",
        reasons: ["You don't have permission to do that."],
      });
      expect((await getEntry(t, entryId)).state.kind).toBe("submitted");
      // The endpoint itself is for competition admins
      await expect(
        signInAsTestUser(t, user).mutation(
          api.admin.competition.entries.approve,
          { entryId },
        ),
      ).rejects.toThrow("You don't have permission to do that.");
    });

    it("won't let someone else edit an entry", async () => {
      const t = createConvexTest();
      const { entryId } = await startEntry(t, {
        name: "Mine",
        address: "8 Plover Court",
        placeId: "plover-8",
      });
      const stranger = await createTestUser(t, { user: { name: "Stranger" } });

      const result = await signInAsTestUser(t, stranger).run((ctx) =>
        entry.send(ctx, entryId, { type: "EDIT", name: "Theirs now" }),
      );

      expect(result).toMatchObject({
        status: "rejected",
        code: "NOT_ALLOWED",
        reasons: ["Only the person who made this entry can do that."],
      });
      expect((await getEntry(t, entryId)).state.name).toBe("Mine");
    });

    it("won't take a server event from a signed-in caller", async () => {
      const t = createConvexTest();
      const { asEntrant, entryId } = await startEntry(t, {
        name: "Sneaky",
        address: "2 Ransonnet Dr",
        placeId: "ransonnet-2",
      });

      await expect(
        asEntrant.run((ctx) =>
          entry.send(ctx, entryId, {
            type: "GEOCODED",
            // @ts-expect-error server events need the catalog's internal ctx
            lat: inside.latitude,
            lng: inside.longitude,
            placeId: "ransonnet-2",
          }),
        ),
      ).rejects.toThrow(/server event/);
    });
  });

  describe("the address rule", () => {
    it("lets only one entry hold an address, until it's rejected", async () => {
      const t = createConvexTest();
      const first = await startEntry(t, {
        name: "First",
        address: "35 Keel Retreat",
        placeId: "keel-35",
      });
      const second = await startEntry(t, {
        name: "Second",
        address: "35 Keel Retreat",
        placeId: "keel-35",
      });
      await first.asEntrant.action(api.my.entries.submit, {});

      const refused = await second.asEntrant.run((ctx) =>
        entry.send(ctx, second.entryId, { type: "SUBMIT" }),
      );
      expect(refused).toEqual({
        status: "rejected",
        code: "GUARD_BLOCKED",
        reasons: ["That address is already used by another entry."],
      });
      // The endpoint names the address
      await expect(
        second.asEntrant.action(api.my.entries.submit, {}),
      ).rejects.toThrow("Address 35 Keel Retreat is already used!");

      const admin = await createTestUser(t, {
        user: { isCompetitionAdmin: true },
      });
      await signInAsTestUser(t, admin).mutation(
        api.admin.competition.entries.reject,
        { entryId: first.entryId, rejectedReason: "Wrong house" },
      );

      await second.asEntrant.action(api.my.entries.submit, {});
      expect((await getEntry(t, second.entryId)).state.kind).toBe("submitted");
    });

    it("checks Google's place too, as the submission finishes", async () => {
      const t = createConvexTest();
      const first = await startEntry(t, {
        name: "First",
        address: "6 Moreau Grove",
        placeId: "moreau-6",
      });
      const second = await startEntry(t, {
        name: "Second",
        address: "6 Moreau Grove, Geographe",
        placeId: "moreau-6-typed",
      });
      await first.asEntrant.action(api.my.entries.submit, {});
      // Google resolves the second entrant's pick to the first one's place
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          json: async () => ({ id: "moreau-6", location: inside }),
        })),
      );

      await expect(
        second.asEntrant.action(api.my.entries.submit, {}),
      ).rejects.toThrow("Address 6 Moreau Grove, Geographe is already used!");
      expect((await getEntry(t, second.entryId)).state.kind).toBe("draft");
    });
  });

  it("keeps a returning entrant's number from last year", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t, { user: { name: "Returning" } });
    await t.run(async (ctx) => {
      const { past } = await ensureTestCompetitions(ctx);
      await ctx.db.insert("entries", {
        competitionId: past._id,
        submittedByUserId: user._id,
        state: {
          kind: "approved",
          submittedAt: Date.now(),
          approvedAt: Date.now(),
          entryNumber: 42,
          name: "Last Year's Lights",
          houseAddress: {
            address: "9 Keel Retreat",
            lat: inside.latitude,
            lng: inside.longitude,
            placeId: "keel-9",
          },
        },
        stateTimers: [],
      });
    });
    const asEntrant = signInAsTestUser(t, user);

    await asEntrant.mutation(api.my.entries.enter, {});
    const draft = await findEntryOf(t, user._id);
    expect(draft.previousEntryId).toBeDefined();
    expect(draft.state).toEqual({
      kind: "draft",
      name: "Last Year's Lights",
      houseAddress: { address: "9 Keel Retreat", placeId: "keel-9" },
      entryNumber: 42,
    });

    await asEntrant.action(api.my.entries.submit, {});
    const admin = await createTestUser(t, {
      user: { isCompetitionAdmin: true },
    });
    await signInAsTestUser(t, admin).mutation(
      api.admin.competition.entries.approve,
      { entryId: draft._id },
    );
    expect((await getEntry(t, draft._id)).state).toMatchObject({
      kind: "approved",
      entryNumber: 42,
    });
  });

  it("won't let an entrant enter twice", async () => {
    const t = createConvexTest();
    const { asEntrant } = await startEntry(t, {
      name: "Eager",
      address: "5 Twine Court",
      placeId: "twine-5",
    });

    await expect(asEntrant.mutation(api.my.entries.enter, {})).rejects.toThrow(
      "You've already entered this year's competition.",
    );
  });

  describe("the submitting timer", () => {
    // The submit action stalls after SUBMIT, as if it died
    const submitWithoutFinishing = async (t: ConvexTest, user: Doc<"users">) =>
      await signInAsTestUser(t, user).mutation(
        internal.internal.entries.startSubmitting,
        { userId: user._id },
      );

    it("sends an entry stuck submitting back to draft, which frees its address", async () => {
      vi.useFakeTimers();
      const t = createConvexTest();
      const stuck = await startEntry(t, {
        name: "Stuck",
        address: "16 Burgee Cove",
        placeId: "burgee-16",
      });
      const next = await startEntry(t, {
        name: "Next",
        address: "16 Burgee Cove",
        placeId: "burgee-16",
      });

      await submitWithoutFinishing(t, stuck.user);
      const submitting = await getEntry(t, stuck.entryId);
      expect(submitting.state.kind).toBe("submitting");
      expect(submitting.stateTimers).toEqual([
        expect.objectContaining({
          event: "TIMED_OUT",
          dueAt: Date.now() + SUBMITTING_TIMEOUT_MS,
        }),
      ]);
      await expect(
        next.asEntrant.action(api.my.entries.submit, {}),
      ).rejects.toThrow("Address 16 Burgee Cove is already used!");

      await advance(t, SUBMITTING_TIMEOUT_MS - 1000);
      expect((await getEntry(t, stuck.entryId)).state.kind).toBe("submitting");

      await advance(t, 1000);
      const reverted = await getEntry(t, stuck.entryId);
      expect(reverted.state).toEqual({
        kind: "draft",
        name: "Stuck",
        houseAddress: { address: "16 Burgee Cove", placeId: "burgee-16" },
      });
      expect(reverted.stateTimers).toEqual([]);
      expect(await historyOf(t, stuck.entryId)).toContain(
        "submitting TIMED_OUT draft by timer",
      );

      await next.asEntrant.action(api.my.entries.submit, {});
      expect((await getEntry(t, next.entryId)).state.kind).toBe("submitted");
    });

    it("is cancelled when the submission finishes", async () => {
      vi.useFakeTimers();
      const t = createConvexTest();
      const { asEntrant, entryId } = await startEntry(t, {
        name: "Quick",
        address: "4 Mussel Court",
        placeId: "mussel-4",
      });

      await asEntrant.action(api.my.entries.submit, {});
      expect((await getEntry(t, entryId)).stateTimers).toEqual([]);

      await advance(t, SUBMITTING_TIMEOUT_MS + 1000);
      expect((await getEntry(t, entryId)).state.kind).toBe("submitted");
    });

    it("is the only way out of submitting besides the action", async () => {
      const t = createConvexTest();
      const { user, entryId } = await startEntry(t, {
        name: "Waiting",
        address: "7 Mussel Court",
        placeId: "mussel-7",
      });
      await submitWithoutFinishing(t, user);

      // Only the timer, or the server reporting back, moves it on
      const result = await t.run(async (ctx) =>
        entry.send(await asInternal(machines, ctx), entryId, {
          type: "SUBMIT_FAILED",
        }),
      );
      expect(result).toMatchObject({ status: "done", to: "draft" });
      expect((await getEntry(t, entryId)).stateTimers).toEqual([]);
    });
  });
});
