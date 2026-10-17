import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import {
  createConvexTestWithUser,
  createTestEntry,
  getTestUser,
} from "../features/common/tests/testingHelpers";
import { competitions } from "../features/competitions/model";

const stubGooglePlace = (placeId: string) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        places: [
          { id: placeId, location: { latitude: -33.633, longitude: 115.39 } },
        ],
      }),
    })),
  );

describe("submit", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("stores the place id Google returns, not the one the client sent", async () => {
    const { t } = await createConvexTestWithUser();
    await createTestEntry(t, {
      name: "Twinkle Town",
      houseAddress: { address: "35 Keel Retreat", placeId: "client-chosen" },
    });
    stubGooglePlace("google-place");

    await t.action(api.my.entries.submit, {});

    const entry = await t.query(api.my.entries.find, {});
    expect(entry).toMatchObject({
      status: "submitted",
      houseAddress: { address: "35 Keel Retreat", placeId: "google-place" },
    });
  });

  it("checks for duplicates using Google's place id", async () => {
    const { t } = await createConvexTestWithUser();
    const user = await getTestUser(t);
    await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      const neighbour = await ctx.db.insert("users", {});
      await ctx.db.insert("entries", {
        competitionId: competition._id,
        submittedByUserId: neighbour,
        status: "approved",
        submittedAt: Date.now(),
        approvedAt: Date.now(),
        entryNumber: 1,
        name: "Already here",
        houseAddress: {
          address: "35 Keel Retreat",
          lat: -33.633,
          lng: 115.39,
          placeId: "google-place",
        },
      });
    });
    await createTestEntry(t, {
      name: "Copycat",
      houseAddress: { address: "35 Keel Retreat", placeId: "made-up" },
    });
    stubGooglePlace("google-place");

    await expect(t.action(api.my.entries.submit, {})).rejects.toThrow(
      "Address 35 Keel Retreat is already used!",
    );

    const entry = await t.query(api.my.entries.find, {});
    expect(entry).toMatchObject({
      status: "draft",
      submittedByUserId: user._id,
    });
  });
});
