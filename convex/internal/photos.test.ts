import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../_generated/dataModel";
import { internal } from "../../shared/api";
import {
  createConvexTest,
  createTestStorageId,
  ensureTestCompetitions,
} from "../features/common/tests/testingHelpers.vitest";
import type { ConvexTest } from "../features/common/tests/testingHelpers.vitest";

const OLD_URL = "https://old-deployment.convex.cloud/api/storage/old";

const insertPhotos = async (t: ConvexTest) => {
  const fileIds = [
    await createTestStorageId(t),
    await createTestStorageId(t),
    await createTestStorageId(t),
  ];
  const missingFileId = await createTestStorageId(t);
  await t.run((ctx) => ctx.storage.delete(missingFileId));

  return await t.run(async (ctx) => {
    const competition = (await ensureTestCompetitions(ctx)).current;
    const owner = await ctx.db.insert("users", {});
    const entryId = await ctx.db.insert("entries", {
      competitionId: competition._id,
      submittedByUserId: owner,
      status: "draft",
    });
    const insertUploaded = (storageId: Id<"_storage">) =>
      ctx.db.insert("photos", {
        entryId,
        kind: "convex_stored",
        uploadState: { status: "uploaded", storageId, url: OLD_URL },
      });

    const uploaded = [];
    for (const storageId of fileIds)
      uploaded.push({ photoId: await insertUploaded(storageId), storageId });
    const missing = await insertUploaded(missingFileId);
    await ctx.db.insert("photos", {
      entryId,
      kind: "mock",
      mockPath: "house.jpg",
    });
    await ctx.db.insert("photos", {
      entryId,
      kind: "convex_stored",
      uploadState: {
        status: "uploading",
        uploadStartedAt: Date.now(),
        uploadUrl: "https://old-deployment.convex.cloud/api/upload",
      },
    });
    return { uploaded, missing };
  });
};

const refreshAll = async (t: ConvexTest) => {
  await t.mutation(internal.photos.refreshPhotoUrls, { batchSize: 2 });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
};

describe("refreshPhotoUrls", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("points uploaded photos at their file's current URL, page by page", async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = createConvexTest();
    const { uploaded, missing } = await insertPhotos(t);

    await refreshAll(t);

    await t.run(async (ctx) => {
      for (const { photoId, storageId } of uploaded) {
        const photo = await ctx.db.get(photoId);
        const url = await ctx.storage.getUrl(storageId);
        expect(url).not.toBe(OLD_URL);
        expect(photo).toMatchObject({ uploadState: { url } });
      }
      expect(await ctx.db.get(missing)).toMatchObject({
        uploadState: { url: OLD_URL },
      });
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining(missing));
    expect(log).toHaveBeenCalledWith(
      "Refreshed photo URLs: 3 updated, 1 with no stored file",
    );
  });

  it("changes nothing the second time", async () => {
    vi.useFakeTimers();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = createConvexTest();
    await insertPhotos(t);

    await refreshAll(t);
    const before = await t.run((ctx) => ctx.db.query("photos").collect());
    await refreshAll(t);

    expect(await t.run((ctx) => ctx.db.query("photos").collect())).toEqual(
      before,
    );
    expect(log).toHaveBeenLastCalledWith(
      "Refreshed photo URLs: 0 updated, 1 with no stored file",
    );
  });
});
