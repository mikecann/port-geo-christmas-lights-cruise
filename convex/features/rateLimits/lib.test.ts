import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import {
  createApprovedTestEntryToVoteFor,
  createConvexTestWithUser,
  createTestEntry,
} from "../common/tests/testingHelpers.vitest";
import { competitions } from "../competitions/model";
import { RATE_LIMITED_MESSAGE } from "./lib";

describe("rate limits", () => {
  it("limits entering the competition to 5 an hour", async () => {
    const { t } = await createConvexTestWithUser();
    for (let i = 0; i < 5; i++) {
      await t.mutation(api.my.entries.enter, {});
      await t.mutation(api.my.entries.remove, {});
    }

    await expect(t.mutation(api.my.entries.enter, {})).rejects.toThrow(
      RATE_LIMITED_MESSAGE,
    );
  });

  it("counts failed submits towards the limit of 10 an hour", async () => {
    const { t } = await createConvexTestWithUser();
    // A draft with no address fails before geocoding, but still uses a token
    await createTestEntry(t);
    for (let i = 0; i < 10; i++)
      await expect(t.action(api.my.entries.submit, {})).rejects.toThrow(
        "choose your house address",
      );

    await expect(t.action(api.my.entries.submit, {})).rejects.toThrow(
      RATE_LIMITED_MESSAGE,
    );
  });

  it("limits starting photo uploads to 30 an hour", async () => {
    const { t } = await createConvexTestWithUser();
    await createTestEntry(t);
    for (let i = 0; i < 30; i++) {
      await t.mutation(api.my.photos.beginUpload, {});
      // Clear the placeholder so the per-entry photo cap doesn't kick in first
      await t.run(async (ctx) => {
        for (const photo of await ctx.db.query("photos").collect())
          await ctx.db.delete(photo._id);
      });
    }

    await expect(t.mutation(api.my.photos.beginUpload, {})).rejects.toThrow(
      RATE_LIMITED_MESSAGE,
    );
  });

  it("limits voting and cancelling to 30 changes per 10 minutes", async () => {
    const { t } = await createConvexTestWithUser();
    const entry = await createApprovedTestEntryToVoteFor(t);
    await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      await ctx.db.patch(competition._id, { votingOpen: true });
    });

    const vote = () =>
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        sawInPerson: false,
      });
    for (let i = 0; i < 15; i++) {
      await vote();
      const [existing] = await t.run((ctx) => ctx.db.query("votes").collect());
      await t.mutation(api.my.votes.cancel, { voteId: existing._id });
    }

    await expect(vote()).rejects.toThrow(RATE_LIMITED_MESSAGE);
  });
});
