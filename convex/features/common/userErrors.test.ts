import { afterEach, describe, expect, it, vi } from "vitest";
import { ConvexError } from "convex/values";
import { api } from "../../_generated/api";
import {
  createConvexTest,
  createConvexTestWithUser,
  createTestEntry,
  moveEntryToStatus,
} from "./tests/testingHelpers.vitest";
import { competitions } from "../competitions/model";
import { NOT_SIGNED_IN_MESSAGE } from "./lib";
import { votingClosedMessage } from "../../../shared/eventStatus";

// Convex only passes ConvexError messages through in production; anything
// else reaches the user as "Server Error"
const expectConvexError = async (
  promise: Promise<unknown>,
  message: string,
) => {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ConvexError);
  expect((error as ConvexError<string>).data).toContain(message);
};

const setCurrentCompetition = (
  t: Awaited<ReturnType<typeof createConvexTestWithUser>>["t"],
  fields: { entriesOpen?: boolean; votingOpen?: boolean },
) =>
  t.run(async (ctx) => {
    const competition = await competitions.query(ctx).current();
    await ctx.db.patch(competition._id, fields);
  });

describe("errors a user can hit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("asks people who aren't signed in to sign in", async () => {
    const t = createConvexTest();

    await expectConvexError(
      t.mutation(api.my.entries.enter, {}),
      NOT_SIGNED_IN_MESSAGE,
    );
  });

  it("says when entries are closed", async () => {
    const { t } = await createConvexTestWithUser();
    await setCurrentCompetition(t, { entriesOpen: false });

    await expectConvexError(
      t.mutation(api.my.entries.enter, {}),
      "Competition entries are currently closed",
    );
  });

  it("says when voting is closed", async () => {
    const { t } = await createConvexTestWithUser();
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, { entryId: entry._id, status: "approved" });

    await expectConvexError(
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
      }),
      votingClosedMessage(2026),
    );
  });

  it("says when someone has already voted in a category", async () => {
    const { t } = await createConvexTestWithUser();
    await setCurrentCompetition(t, { votingOpen: true });
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, { entryId: entry._id, status: "approved" });
    const vote = () =>
      t.mutation(api.my.votes.vote, {
        entryId: entry._id,
        category: "best_display",
      });

    await vote();
    await expectConvexError(vote(), "already voted in this category");
  });

  it("says when an entry can't be changed", async () => {
    const { t } = await createConvexTestWithUser();
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, { entryId: entry._id, status: "submitted" });

    await expectConvexError(
      t.mutation(api.my.photos.beginUpload, {}),
      "can only be changed while it's a draft",
    );
  });

  it("says when the address can't be found", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const { t } = await createConvexTestWithUser();
    await createTestEntry(t, {
      name: "Twinkle Town",
      houseAddress: { address: "1 Nowhere Lane", placeId: "pid" },
    });

    await expectConvexError(
      t.action(api.my.entries.submit, {}),
      'Unable to find your address "1 Nowhere Lane"',
    );
  });
});
