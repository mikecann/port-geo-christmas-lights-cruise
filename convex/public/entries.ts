import { entries } from "../features/entries/model";
import { v } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../_generated/api";
import { photos } from "../features/photos/model";
import { convex } from "../schema";
import {
  competitions,
  CURRENT_COMPETITION_YEAR,
} from "../features/competitions/model";
import type { QueryCtx } from "../_generated/server";

const competitionInput = {
  competitionYear: v.optional(v.number()),
};

const resolveCompetition = (ctx: QueryCtx, competitionYear?: number) =>
  competitions
    .query(ctx)
    .forYear(competitionYear ?? CURRENT_COMPETITION_YEAR)
    .get();

export const list = convex
  .query()
  .input(competitionInput)
  .handler(async (context, input) => {
    const competition = await resolveCompetition(
      context,
      input.competitionYear,
    );
    return await entries.query(context).listApproved(competition._id);
  })
  .public();

export const listWithFirstPhoto = convex
  .query()
  .input(competitionInput)
  .handler(async (context, input) => {
    const competition = await resolveCompetition(
      context,
      input.competitionYear,
    );
    const docs = await entries.query(context).listApproved(competition._id);
    return await Promise.all(
      docs.map(async (entry) => ({
        entry,
        photo: await photos.forEntry(entry._id).findFirst(context.db),
      })),
    );
  })
  .public();

export const listWithPhotos = convex
  .query()
  .input(competitionInput)
  .handler(async (context, input) => {
    const competition = await resolveCompetition(
      context,
      input.competitionYear,
    );
    const docs = await entries.query(context).listApproved(competition._id);
    return await Promise.all(
      docs.map(async (entry) => ({
        entry,
        photos: await photos.forEntry(entry._id).list(context.db),
      })),
    );
  })
  .public();

export const count = convex
  .query()
  .input(competitionInput)
  .handler(async (context, input) => {
    const competition = await resolveCompetition(
      context,
      input.competitionYear,
    );
    return await entries.query(context).countApproved(competition._id);
  })
  .public();

export const getRandomThree = convex
  .query()
  .input(competitionInput)
  .handler(async (context, input) => {
    const competition = await resolveCompetition(
      context,
      input.competitionYear,
    );
    const allApproved = await entries
      .query(context)
      .listApproved(competition._id);

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
  })
  .public();

export const get = convex
  .query()
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    const entry = await entries
      .query(context)
      .forEntry(input.entryId)
      .getApproved();
    return entry;
  })
  .public();

export const find = convex
  .query()
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    const entry = await entries.query(context).forEntry(input.entryId).find();
    if (!entry) return null;
    if (entry.status !== "approved") throw new Error("Entry is not approved");
    return entry;
  })
  .public();

export const getWithPhotos = convex
  .query()
  .input({ entryId: v.id("entries") })
  .handler(async (context, input) => {
    const entry = await entries
      .query(context)
      .forEntry(input.entryId)
      .getApproved();
    return {
      entry,
      photos: await photos.forEntry(input.entryId).list(context.db),
    };
  })
  .public();

export type EntryWithFirstPhoto = FunctionReturnType<
  typeof api.public.entries.listWithFirstPhoto
>[number];

export type EntryWithPhotos = FunctionReturnType<
  typeof api.public.entries.getWithPhotos
>;
