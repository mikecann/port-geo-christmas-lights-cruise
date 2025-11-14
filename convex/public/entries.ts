import { v } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../_generated/api";
import { photos } from "../features/photos/model";
import { convex } from "../schema";
import { queryServicesMiddleware } from "../features/services";

export const list = convex
  .query()
  .use(queryServicesMiddleware)
  .input({})
  .handler(async ({ context }) => {
    return await context.services.entries.listApproved();
  });

export const listWithFirstPhoto = convex
  .query()
  .use(queryServicesMiddleware)
  .input({})
  .handler(async ({ context }) => {
    const docs = await context.services.entries.listApproved();
    return await Promise.all(
      docs.map(async (entry) => ({
        entry,
        photo: await photos.forEntry(entry._id).findFirst(context.db),
      })),
    );
  });

export const listWithPhotos = convex
  .query()
  .use(queryServicesMiddleware)
  .input({})
  .handler(async ({ context }) => {
    const docs = await context.services.entries.listApproved();
    return await Promise.all(
      docs.map(async (entry) => ({
        entry,
        photos: await photos.forEntry(entry._id).list(context.db),
      })),
    );
  });

export const count = convex
  .query()
  .use(queryServicesMiddleware)
  .input({})
  .handler(async ({ context }) => {
    return await context.services.entries.countApproved();
  });

export const getRandomThree = convex
  .query()
  .use(queryServicesMiddleware)
  .input({})
  .handler(async ({ context }) => {
    const allApproved = await context.services.entries.listApproved();

    if (allApproved.length === 0) return [];

    if (allApproved.length <= 3)
      return await Promise.all(
        allApproved.map(async (entry) => ({
          entry,
          photo: await photos.forEntry(entry._id).findFirst(context.db),
        })),
      );

    // Fisher-Yates shuffle and take first 3
    const shuffled = [...allApproved];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedThree = shuffled.slice(0, 3);
    return await Promise.all(
      selectedThree.map(async (entry) => ({
        entry,
        photo: await photos.forEntry(entry._id).findFirst(context.db),
      })),
    );
  });

export const get = convex
  .query()
  .use(queryServicesMiddleware)
  .input({ entryId: v.id("entries") })
  .handler(async ({ context, input }) => {
    const entry = await context.services.entries.getApproved({
      entryId: input.entryId,
    });
    return entry;
  });

export const find = convex
  .query()
  .use(queryServicesMiddleware)
  .input({ entryId: v.id("entries") })
  .handler(async ({ context, input }) => {
    const entry = await context.services.entries.find({
      entryId: input.entryId,
    });
    if (!entry) return null;
    if (entry.status !== "approved") throw new Error("Entry is not approved");
    return entry;
  });

export const getWithPhotos = convex
  .query()
  .use(queryServicesMiddleware)
  .input({ entryId: v.id("entries") })
  .handler(async ({ context, input }) => {
    const entry = await context.services.entries.getApproved({
      entryId: input.entryId,
    });
    return {
      entry,
      photos: await photos.forEntry(input.entryId).list(context.db),
    };
  });

export type EntryWithFirstPhoto = FunctionReturnType<
  typeof api.public.entries.listWithFirstPhoto
>[number];

export type EntryWithPhotos = FunctionReturnType<
  typeof api.public.entries.getWithPhotos
>;
