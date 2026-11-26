import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import { api, internal } from "../_generated/api";
import { MAX_USER_NAME_LENGTH } from "../../shared/constants";
import { NOT_SIGNED_IN_MESSAGE } from "../features/common/lib";
import {
  createConvexTest,
  createConvexTestWithUser,
  createTestUser,
  getTestUser,
  signInAsTestUser,
} from "../features/common/tests/testingHelpers.vitest";

describe("my.user.updateName", () => {
  it("updates the signed-in user's name and trims surrounding spaces", async () => {
    const base = createConvexTest();
    const user = await createTestUser(base, {
      user: { email: "evo.32@bigpond.com" },
    });
    const t = signInAsTestUser(base, user);
    const otherId = await base.run((ctx) =>
      ctx.db.insert("users", { name: "Neighbour", email: "other@example.com" }),
    );

    await t.mutation(api.my.user.updateName, {
      name: "  Troy and Jennifer Evans  ",
    });

    const me = await getTestUser(t);
    expect(me.name).toBe("Troy and Jennifer Evans");
    const other = await base.run((ctx) => ctx.db.get(otherId));
    expect(other?.name).toBe("Neighbour");
  });

  it("refuses a blank name", async () => {
    const base = createConvexTest();
    const user = await createTestUser(base, {
      user: { name: "Existing Name" },
    });
    const t = signInAsTestUser(base, user);

    const error = await t
      .mutation(api.my.user.updateName, { name: "   " })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<string>).data).toBe("Please enter your name.");
    expect((await getTestUser(t)).name).toBe("Existing Name");
  });

  it("refuses a name over the length limit", async () => {
    const { t } = await createConvexTestWithUser();

    await expect(
      t.mutation(api.my.user.updateName, {
        name: "a".repeat(MAX_USER_NAME_LENGTH + 1),
      }),
    ).rejects.toThrow(`${MAX_USER_NAME_LENGTH} characters or fewer`);
  });

  it("requires a signed-in user", async () => {
    const t = createConvexTest();

    await expect(
      t.mutation(api.my.user.updateName, { name: "Someone" }),
    ).rejects.toThrow(NOT_SIGNED_IN_MESSAGE);
  });
});

describe("internal.users.backfillNames", () => {
  it("fills in blank names and leaves existing names untouched", async () => {
    const t = createConvexTest();
    const { blankId, namedId, deletedId } = await t.run(async (ctx) => {
      const blankId = await ctx.db.insert("users", {
        email: "evo.32@bigpond.com",
      });
      const namedId = await ctx.db.insert("users", {
        name: "Already Named",
        email: "named@example.com",
      });
      const deletedId = await ctx.db.insert("users", {
        email: "gone@example.com",
      });
      await ctx.db.delete(deletedId);
      return { blankId, namedId, deletedId };
    });

    const result = await t.mutation(internal.internal.users.backfillNames, {
      updates: [
        { userId: blankId, name: "  Troy and Jennifer Evans  " },
        { userId: namedId, name: "Should Not Overwrite" },
        { userId: deletedId, name: "Missing Person" },
      ],
    });

    expect(result).toEqual({ updated: 1, skipped: 1, missing: 1 });
    const [blank, named] = await t.run(async (ctx) => [
      await ctx.db.get(blankId),
      await ctx.db.get(namedId),
    ]);
    expect(blank?.name).toBe("Troy and Jennifer Evans");
    expect(named?.name).toBe("Already Named");
  });
});
