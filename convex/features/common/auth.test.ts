import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import { api } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import {
  createConvexTest,
  createTestUser,
  signInAsTestUser,
} from "./tests/testingHelpers.vitest";
import { NOT_SIGNED_IN_MESSAGE } from "./lib";
import { NOT_ALLOWED_MESSAGE } from "./auth";

const expectConvexError = async (
  promise: Promise<unknown>,
  message: string,
) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ConvexError);
  expect((error as ConvexError<string>).data).toBe(message);
};

const signedInAs = async (user: Partial<Doc<"users">> = {}) => {
  const t = createConvexTest();
  return signInAsTestUser(t, await createTestUser(t, { user }));
};

describe("auth builders", () => {
  it("asks signed out people to sign in", async () => {
    const t = createConvexTest();
    await expectConvexError(
      t.query(api.my.votes.mine, {}),
      NOT_SIGNED_IN_MESSAGE,
    );
    await expectConvexError(
      t.query(api.admin.competition.entries.getStats, {}),
      NOT_SIGNED_IN_MESSAGE,
    );
    await expectConvexError(
      t.action(api.my.entries.submit, {}),
      NOT_SIGNED_IN_MESSAGE,
    );
  });

  it("treats a session whose user was deleted as signed out", async () => {
    const t = createConvexTest();
    const user = await createTestUser(t);
    await t.run((ctx) => ctx.db.delete(user._id));

    await expectConvexError(
      signInAsTestUser(t, user).query(api.my.votes.mine, {}),
      NOT_SIGNED_IN_MESSAGE,
    );
  });

  it("keeps people without the role out of admin functions", async () => {
    const asUser = await signedInAs();
    await expectConvexError(
      asUser.query(api.admin.competition.entries.getStats, {}),
      NOT_ALLOWED_MESSAGE,
    );
    await expectConvexError(
      asUser.action(api.admin.competition.votes.getAllVotesForExport, {}),
      NOT_ALLOWED_MESSAGE,
    );

    const asCompetitionAdmin = await signedInAs({ isCompetitionAdmin: true });
    await expectConvexError(
      asCompetitionAdmin.query(api.admin.system.users.count, {}),
      NOT_ALLOWED_MESSAGE,
    );
  });

  it("lets competition admins and system admins run competition admin functions", async () => {
    for (const roles of [
      { isCompetitionAdmin: true },
      { isSystemAdmin: true },
    ]) {
      const asAdmin = await signedInAs(roles);
      expect(
        await asAdmin.query(api.admin.competition.entries.getStats, {}),
      ).toMatchObject({ totalEntries: 0 });
      expect(
        await asAdmin.action(
          api.admin.competition.votes.getAllVotesForExport,
          {},
        ),
      ).toEqual([]);
    }
  });

  it("gives public queries the signed in user, or null", async () => {
    const t = createConvexTest();
    expect(await t.query(api.public.user.find, {})).toBeNull();

    const user = await createTestUser(t, { user: { name: "Holly" } });
    expect(
      await signInAsTestUser(t, user).query(api.public.user.find, {}),
    ).toMatchObject({ _id: user._id, name: "Holly" });
  });
});
