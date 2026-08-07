import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import {
  createConvexTest,
  createTestUser,
  signInAsTestUser,
} from "../common/tests/testingHelpers";
import { competitions } from "../competitions/model";

describe("photo access", () => {
  it("does not expose photos from an unapproved entry", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);
    const { entryId } = await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      const entryId = await ctx.db.insert("entries", {
        competitionId: competition._id,
        submittedByUserId: user._id,
        status: "draft",
      });
      await ctx.db.insert("photos", {
        entryId,
        kind: "mock",
        mockPath: "private-draft.jpg",
      });
      return { entryId };
    });

    await expect(
      t.query(api.public.photos.listForEntry, { entryId }),
    ).rejects.toThrow("Entry is not approved");
  });

  it("does not let a user remove another entrant's photo", async () => {
    const t = createConvexTest();
    const owner = await createTestUser(t);
    const attacker = await createTestUser(t);
    const { photoId } = await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      const ownerEntryId = await ctx.db.insert("entries", {
        competitionId: competition._id,
        submittedByUserId: owner._id,
        status: "draft",
      });
      await ctx.db.insert("entries", {
        competitionId: competition._id,
        submittedByUserId: attacker._id,
        status: "draft",
      });
      const photoId = await ctx.db.insert("photos", {
        entryId: ownerEntryId,
        kind: "mock",
        mockPath: "owner-photo.jpg",
      });
      return { photoId };
    });
    const asAttacker = signInAsTestUser(t, attacker);

    await expect(
      asAttacker.mutation(api.my.photos.remove, { photoId }),
    ).rejects.toThrow("Cannot modify another entry's photo");
  });
});
