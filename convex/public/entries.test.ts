import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import {
  createConvexTest,
  createTestStorageId,
  createTestUser,
} from "../features/common/tests/testingHelpers.vitest";
import type { ConvexTest } from "../features/common/tests/testingHelpers.vitest";
import { competitions } from "../features/competitions/model";

const seedApprovedEntryWithPhotos = async (t: ConvexTest) => {
  const user = await createTestUser(t);
  const storageId = await createTestStorageId(t);
  return await t.run(async (ctx) => {
    const competition = await competitions.query(ctx).current();
    const entryId = await ctx.db.insert("entries", {
      competitionId: competition._id,
      submittedByUserId: user._id,
      state: {
        kind: "approved",
        submittedAt: Date.now(),
        approvedAt: Date.now(),
        entryNumber: 7,
        name: "Twinkle Town",
        houseAddress: {
          address: "1 Keel Retreat",
          lat: -33.63,
          lng: 115.39,
          placeId: "pid-1",
        },
      },
      stateTimers: [],
    });
    const uploadingPhotoId = await ctx.db.insert("photos", {
      entryId,
      kind: "convex_stored",
      uploadState: {
        status: "uploading",
        uploadStartedAt: Date.now(),
        uploadUrl: "https://upload.example/secret",
      },
    });
    const uploadedPhotoId = await ctx.db.insert("photos", {
      entryId,
      kind: "convex_stored",
      uploadState: {
        status: "uploaded",
        storageId,
        url: "https://files.example/photo.jpg",
      },
    });
    return { entryId, uploadingPhotoId, uploadedPhotoId, competition };
  });
};

describe("public entry shapes", () => {
  it("returns approved entries without who submitted them", async () => {
    const t = createConvexTest();
    const { entryId, competition } = await seedApprovedEntryWithPhotos(t);

    expect(await t.query(api.public.entries.get, { entryId })).toEqual({
      _id: entryId,
      competitionId: competition._id,
      name: "Twinkle Town",
      entryNumber: 7,
      houseAddress: { address: "1 Keel Retreat", lat: -33.63, lng: 115.39 },
    });
  });

  it("only returns uploaded photos, without storage ids or upload URLs", async () => {
    const t = createConvexTest();
    const { entryId, uploadedPhotoId } = await seedApprovedEntryWithPhotos(t);
    const expectedPhoto = {
      _id: uploadedPhotoId,
      entryId,
      kind: "convex_stored",
      url: "https://files.example/photo.jpg",
    };

    const withPhotos = await t.query(api.public.entries.getWithPhotos, {
      entryId,
    });
    expect(withPhotos?.photos).toEqual([expectedPhoto]);
    expect(withPhotos?.entry).not.toHaveProperty("submittedByUserId");

    const [listed] = await t.query(api.public.entries.listWithFirstPhoto, {});
    expect(listed.photo).toEqual(expectedPhoto);

    expect(await t.query(api.public.photos.listForEntry, { entryId })).toEqual([
      expectedPhoto,
    ]);
    expect(
      await t.query(api.public.photos.findFirstForEntry, { entryId }),
    ).toEqual(expectedPhoto);
  });

  it("still serves OG metadata for an entry", async () => {
    const t = createConvexTest();
    const { entryId } = await seedApprovedEntryWithPhotos(t);

    const response = await t.fetch(`/api/og/entry?entryId=${entryId}`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      title: "Twinkle Town",
      description: "1 Keel Retreat",
      imageUrl: "https://files.example/photo.jpg",
    });
  });
});

describe("public entry lookups by id", () => {
  const seedUnavailableIds = async (t: ConvexTest) => {
    const user = await createTestUser(t);
    const { uploadedPhotoId } = await seedApprovedEntryWithPhotos(t);
    const submittedEntryId = await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      return await ctx.db.insert("entries", {
        competitionId: competition._id,
        submittedByUserId: user._id,
        state: {
          kind: "submitted",
          submittedAt: Date.now(),
          name: "Not Yet Approved",
          houseAddress: {
            address: "2 Keel Retreat",
            lat: -33.63,
            lng: 115.39,
            placeId: "pid-2",
          },
        },
        stateTimers: [],
      });
    });
    return {
      malformed: "k57aaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      otherTable: uploadedPhotoId,
      notApproved: submittedEntryId,
    };
  };

  it("returns null for ids that aren't an approved entry", async () => {
    const t = createConvexTest();
    const ids = await seedUnavailableIds(t);

    for (const entryId of Object.values(ids)) {
      expect(await t.query(api.public.entries.find, { entryId })).toBeNull();
      expect(
        await t.query(api.public.entries.getWithPhotos, { entryId }),
      ).toBeNull();
    }
  });

  it("answers OG lookups for those ids with a 404", async () => {
    const t = createConvexTest();
    const ids = await seedUnavailableIds(t);

    for (const entryId of Object.values(ids)) {
      const response = await t.fetch(`/api/og/entry?entryId=${entryId}`);
      expect(response.status).toBe(404);
    }
  });
});
