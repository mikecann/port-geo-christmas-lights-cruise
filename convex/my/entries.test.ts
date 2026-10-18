import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConvexError } from "convex/values";
import { api } from "../_generated/api";
import {
  createConvexTestWithUser,
  createTestEntry,
  getTestUser,
} from "../features/common/tests/testingHelpers.vitest";
import { competitions } from "../features/competitions/model";

const inside = { latitude: -33.633, longitude: 115.39 };

// Answers Place Details for the given ids, and 404s for anything else
const stubGooglePlaces = (
  places: Record<
    string,
    { id: string; location: { latitude: number; longitude: number } }
  >,
) => {
  const fetch = vi.fn(async (url: string) => {
    const requestedId = decodeURIComponent(url.split("/places/")[1] ?? "");
    const place = places[requestedId];
    if (!place) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, json: async () => place };
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

describe("submit", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("looks up the place the user picked and stores Google's id and location", async () => {
    const { t } = await createConvexTestWithUser();
    await createTestEntry(t, {
      name: "Twinkle Town",
      houseAddress: { address: "35 Keel Retreat", placeId: "client-chosen" },
    });
    const fetch = stubGooglePlaces({
      "client-chosen": { id: "google-place", location: inside },
    });

    await t.action(api.my.entries.submit, {});

    expect(fetch).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places/client-chosen",
      expect.anything(),
    );
    const entry = await t.query(api.my.entries.find, {});
    expect(entry).toMatchObject({
      status: "submitted",
      houseAddress: {
        address: "35 Keel Retreat",
        placeId: "google-place",
        lat: inside.latitude,
        lng: inside.longitude,
      },
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
      houseAddress: { address: "35 Keel Retreat", placeId: "old-id" },
    });
    stubGooglePlaces({ "old-id": { id: "google-place", location: inside } });

    await expect(t.action(api.my.entries.submit, {})).rejects.toThrow(
      "Address 35 Keel Retreat is already used!",
    );

    const entry = await t.query(api.my.entries.find, {});
    expect(entry).toMatchObject({
      status: "draft",
      submittedByUserId: user._id,
    });
  });

  it("lets a neighbour on the same street submit their own house", async () => {
    const { t } = await createConvexTestWithUser();
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
        name: "Number 35",
        houseAddress: {
          address: "35 Keel Retreat",
          lat: -33.633,
          lng: 115.39,
          placeId: "house-35",
        },
      });
    });
    await createTestEntry(t, {
      name: "Number 37",
      houseAddress: { address: "37 Keel Retreat", placeId: "house-37" },
    });
    stubGooglePlaces({
      "house-35": { id: "house-35", location: inside },
      "house-37": { id: "house-37", location: inside },
    });

    await t.action(api.my.entries.submit, {});

    const entry = await t.query(api.my.entries.find, {});
    expect(entry).toMatchObject({
      status: "submitted",
      houseAddress: { address: "37 Keel Retreat", placeId: "house-37" },
    });
  });

  it("refuses a place Google doesn't return and puts the entry back to draft", async () => {
    const { t } = await createConvexTestWithUser();
    await createTestEntry(t, {
      name: "Twinkle Town",
      houseAddress: { address: "35 Keel Retreat", placeId: "made-up" },
    });
    stubGooglePlaces({});

    const error = await t
      .action(api.my.entries.submit, {})
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<string>).data).toContain(
      'Unable to find your address "35 Keel Retreat"',
    );
    const entry = await t.query(api.my.entries.find, {});
    expect(entry).toMatchObject({ status: "draft" });
  });

  it("checks the boundary using Google's location", async () => {
    const { t } = await createConvexTestWithUser();
    await createTestEntry(t, {
      name: "Far Away",
      houseAddress: { address: "1 Hay Street, Perth", placeId: "perth" },
    });
    stubGooglePlaces({
      perth: { id: "perth", location: { latitude: -31.95, longitude: 115.86 } },
    });

    await expect(t.action(api.my.entries.submit, {})).rejects.toThrow(
      "outside the competition area",
    );
    const entry = await t.query(api.my.entries.find, {});
    expect(entry).toMatchObject({ status: "draft" });
  });
});
