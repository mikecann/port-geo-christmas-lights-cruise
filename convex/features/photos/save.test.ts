import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import {
  createConvexTest,
  createTestStorageId,
  createTestUser,
  signInAsTestUser,
  ensureTestCompetitions,
} from "../common/tests/testingHelpers.vitest";
import type { ConvexTest } from "../common/tests/testingHelpers.vitest";
import { competitions } from "../competitions/model";
import { MAX_PHOTO_UPLOAD_BYTES } from "../../../shared/constants";

const setupEntrant = async (t: ConvexTest) => {
  const user = await createTestUser(t);
  const entryId = await t.run(async (ctx) => {
    const competition = await competitions.query(ctx).current();
    return await ctx.db.insert("entries", {
      competitionId: competition._id,
      submittedByUserId: user._id,
      status: "draft",
    });
  });
  return { asUser: signInAsTestUser(t, user), entryId };
};

const insertUploadedPhoto = (
  t: ConvexTest,
  storageId: Id<"_storage">,
  entryId?: Id<"entries">,
) =>
  t.run(async (ctx) => {
    const competition = (await ensureTestCompetitions(ctx)).current;
    const owner = await ctx.db.insert("users", {});
    entryId ??= await ctx.db.insert("entries", {
      competitionId: competition._id,
      submittedByUserId: owner,
      status: "draft",
    });
    return await ctx.db.insert("photos", {
      entryId,
      kind: "convex_stored",
      uploadState: { status: "uploaded", storageId, url: "https://x" },
    });
  });

const storageExists = (t: ConvexTest, storageId: Id<"_storage">) =>
  t.run(async (ctx) => (await ctx.db.system.get(storageId)) !== null);

describe("photo save", () => {
  it("saves a fresh upload", async () => {
    const t = createConvexTest();
    const { asUser } = await setupEntrant(t);
    const { photoId } = await asUser.mutation(api.my.photos.beginUpload, {});
    const storageId = await createTestStorageId(t);

    expect(
      await asUser.mutation(api.my.photos.save, { photoId, storageId }),
    ).toBeNull();

    const photo = await t.run((ctx) => ctx.db.get(photoId));
    expect(photo).toMatchObject({
      uploadState: { status: "uploaded", storageId },
    });
  });

  it("refuses another photo's file and leaves it in place", async () => {
    const t = createConvexTest();
    const victimStorageId = await createTestStorageId(t);
    const victimPhotoId = await insertUploadedPhoto(t, victimStorageId);
    const { asUser: asAttacker } = await setupEntrant(t);
    const { photoId } = await asAttacker.mutation(
      api.my.photos.beginUpload,
      {},
    );

    expect(
      await asAttacker.mutation(api.my.photos.save, {
        photoId,
        storageId: victimStorageId,
      }),
    ).toEqual({ error: expect.stringContaining("couldn't save that photo") });

    expect(await t.run((ctx) => ctx.db.get(photoId))).toBeNull();
    expect(await storageExists(t, victimStorageId)).toBe(true);
    expect(await t.run((ctx) => ctx.db.get(victimPhotoId))).not.toBeNull();
  });

  it("refuses a file created before the upload began", async () => {
    const t = createConvexTest();
    const { asUser } = await setupEntrant(t);
    const storageId = await createTestStorageId(t);
    const { photoId } = await asUser.mutation(api.my.photos.beginUpload, {});
    await t.run((ctx) =>
      ctx.db.patch(photoId, {
        uploadState: {
          status: "uploading",
          uploadStartedAt: Date.now() + 60_000,
          uploadUrl: "https://x",
        },
      }),
    );

    expect(
      await asUser.mutation(api.my.photos.save, { photoId, storageId }),
    ).toEqual({ error: expect.stringContaining("couldn't save that photo") });
    expect(await t.run((ctx) => ctx.db.get(photoId))).toBeNull();
    expect(await storageExists(t, storageId)).toBe(true);
  });

  it("refuses a missing file", async () => {
    const t = createConvexTest();
    const { asUser } = await setupEntrant(t);
    const storageId = await createTestStorageId(t);
    await t.run((ctx) => ctx.storage.delete(storageId));
    const { photoId } = await asUser.mutation(api.my.photos.beginUpload, {});

    expect(
      await asUser.mutation(api.my.photos.save, { photoId, storageId }),
    ).toEqual({ error: expect.stringContaining("couldn't save that photo") });
    expect(await t.run((ctx) => ctx.db.get(photoId))).toBeNull();
  });

  it("deletes a fresh upload that isn't an allowed image type", async () => {
    const t = createConvexTest();
    const { asUser } = await setupEntrant(t);
    const { photoId } = await asUser.mutation(api.my.photos.beginUpload, {});
    const storageId = await createTestStorageId(t, {
      contentType: "text/html",
    });

    expect(
      await asUser.mutation(api.my.photos.save, { photoId, storageId }),
    ).toEqual({ error: "Photos must be JPEG, PNG or WebP images." });
    expect(await storageExists(t, storageId)).toBe(false);
    expect(await t.run((ctx) => ctx.db.get(photoId))).toBeNull();
  });

  it("deletes a fresh upload over 5 MB", async () => {
    const t = createConvexTest();
    const { asUser } = await setupEntrant(t);
    const { photoId } = await asUser.mutation(api.my.photos.beginUpload, {});
    const storageId = await createTestStorageId(t, {
      data: new Uint8Array(MAX_PHOTO_UPLOAD_BYTES + 1),
    });

    expect(
      await asUser.mutation(api.my.photos.save, { photoId, storageId }),
    ).toEqual({ error: "Photos must be 5 MB or smaller." });
    expect(await storageExists(t, storageId)).toBe(false);
  });

  it("applies the same checks to admin saves", async () => {
    const t = createConvexTest();
    const victimStorageId = await createTestStorageId(t);
    await insertUploadedPhoto(t, victimStorageId);
    const admin = await createTestUser(t, {
      user: { isCompetitionAdmin: true },
    });
    const asAdmin = signInAsTestUser(t, admin);
    const entryId = await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      return await ctx.db.insert("entries", {
        competitionId: competition._id,
        submittedByUserId: admin._id,
        status: "draft",
      });
    });
    const { photoId } = await asAdmin.mutation(
      api.admin.competition.photos.beginUpload,
      { entryId },
    );

    expect(
      await asAdmin.mutation(api.admin.competition.photos.save, {
        photoId,
        storageId: victimStorageId,
      }),
    ).toEqual({ error: expect.stringContaining("couldn't save that photo") });
    expect(await storageExists(t, victimStorageId)).toBe(true);
  });
});

describe("uploaded image check", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const saveAndCheck = async (data: BlobPart) => {
    vi.useFakeTimers();
    const t = createConvexTest();
    const { asUser } = await setupEntrant(t);
    const { photoId } = await asUser.mutation(api.my.photos.beginUpload, {});
    // Labelled as a JPEG whatever the bytes are, like a forged upload
    const storageId = await createTestStorageId(t, { data });
    expect(
      await asUser.mutation(api.my.photos.save, { photoId, storageId }),
    ).toBeNull();
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    return { t, photoId, storageId };
  };

  it("keeps a real image", async () => {
    const { t, photoId, storageId } = await saveAndCheck(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );

    expect(await t.run((ctx) => ctx.db.get(photoId))).not.toBeNull();
    expect(await storageExists(t, storageId)).toBe(true);
  });

  it("removes a file that only claims to be an image", async () => {
    const { t, photoId, storageId } = await saveAndCheck("<script></script>");

    expect(await t.run((ctx) => ctx.db.get(photoId))).toBeNull();
    expect(await storageExists(t, storageId)).toBe(false);
  });
});

describe("photo remove", () => {
  it("keeps a file that another photo still uses", async () => {
    const t = createConvexTest();
    const sharedStorageId = await createTestStorageId(t);
    await insertUploadedPhoto(t, sharedStorageId);
    const { asUser, entryId } = await setupEntrant(t);
    const photoId = await insertUploadedPhoto(t, sharedStorageId, entryId);

    await asUser.mutation(api.my.photos.remove, { photoId });

    expect(await t.run((ctx) => ctx.db.get(photoId))).toBeNull();
    expect(await storageExists(t, sharedStorageId)).toBe(true);
  });
});
