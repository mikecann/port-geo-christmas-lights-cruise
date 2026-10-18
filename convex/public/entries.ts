import { entries } from "../features/entries/model";
import { v } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../_generated/api";
import { photos } from "../features/photos/model";
import { convex } from "../schema";
import { competitions } from "../features/competitions/model";
import type { QueryCtx } from "../_generated/server";
import type { ApprovedEntryDoc } from "../features/entries/schema";
import { publicEntryValidator } from "../features/entries/schema";
import { publicPhotoValidator } from "../features/photos/schema";

const competitionInput = {
  competitionYear: v.optional(v.number()),
};

const entryWithFirstPhotoValidator = v.object({
  entry: publicEntryValidator,
  photo: v.union(publicPhotoValidator, v.null()),
});

const entryWithPhotosValidator = v.object({
  entry: publicEntryValidator,
  photos: v.array(publicPhotoValidator),
});

const resolveCompetition = (ctx: QueryCtx, competitionYear?: number) =>
  competitionYear === undefined
    ? competitions.query(ctx).current()
    : competitions.query(ctx).forYear(competitionYear).get();

const withFirstPhoto = async (ctx: QueryCtx, entry: ApprovedEntryDoc) => ({
  entry: entries.toPublic(entry),
  photo: await photos.forEntry(entry._id).findFirstPublic(ctx.db),
});

export const listWithFirstPhoto = convex
  .query()
  .input(competitionInput)
  .returns(v.array(entryWithFirstPhotoValidator))
  .handler(async (context, input) => {
    const competition = await resolveCompetition(
      context,
      input.competitionYear,
    );
    const docs = await entries.query(context).listApproved(competition._id);
    return await Promise.all(
      docs.map((entry) => withFirstPhoto(context, entry)),
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
  .returns(v.array(entryWithFirstPhotoValidator))
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
        allApproved.map((entry) => withFirstPhoto(context, entry)),
      );

    // Fisher-Yates shuffle and take first 3
    const shuffled = [...allApproved];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selectedThree = shuffled.slice(0, 3);
    return await Promise.all(
      selectedThree.map((entry) => withFirstPhoto(context, entry)),
    );
  })
  .public();

export const get = convex
  .query()
  .input({ entryId: v.id("entries") })
  .returns(publicEntryValidator)
  .handler(async (context, input) => {
    const entry = await entries
      .query(context)
      .forEntry(input.entryId)
      .getApproved();
    return entries.toPublic(entry);
  })
  .public();

// Entry links get typed in and shared, so an id that isn't an entry, or an
// entry that isn't approved, comes back as null rather than an error
const findApproved = (ctx: QueryCtx, entryId: string) => {
  const id = ctx.db.normalizeId("entries", entryId);
  return id ? entries.query(ctx).forEntry(id).findApproved() : null;
};

export const find = convex
  .query()
  .input({ entryId: v.string() })
  .returns(v.union(publicEntryValidator, v.null()))
  .handler(async (context, input) => {
    const entry = await findApproved(context, input.entryId);
    return entry ? entries.toPublic(entry) : null;
  })
  .public();

export const getWithPhotos = convex
  .query()
  .input({ entryId: v.string() })
  .returns(v.union(entryWithPhotosValidator, v.null()))
  .handler(async (context, input) => {
    const entry = await findApproved(context, input.entryId);
    if (!entry) return null;
    return {
      entry: entries.toPublic(entry),
      photos: await photos.forEntry(entry._id).listPublic(context.db),
    };
  })
  .public();

// This year's entry with the number on its sign, for the short QR links
const findApprovedByNumber = async (ctx: QueryCtx, entryNumber: number) => {
  const competition = await competitions.query(ctx).current();
  return await entries
    .query(ctx)
    .findApprovedByNumber(competition._id, entryNumber);
};

export const findByNumber = convex
  .query()
  .input({ entryNumber: v.number() })
  .returns(v.union(publicEntryValidator, v.null()))
  .handler(async (context, input) => {
    const entry = await findApprovedByNumber(context, input.entryNumber);
    return entry ? entries.toPublic(entry) : null;
  })
  .public();

export const findByNumberWithPhotos = convex
  .query()
  .input({ entryNumber: v.number() })
  .returns(v.union(entryWithPhotosValidator, v.null()))
  .handler(async (context, input) => {
    const entry = await findApprovedByNumber(context, input.entryNumber);
    if (!entry) return null;
    return {
      entry: entries.toPublic(entry),
      photos: await photos.forEntry(entry._id).listPublic(context.db),
    };
  })
  .public();

export type EntryWithFirstPhoto = FunctionReturnType<
  typeof api.public.entries.listWithFirstPhoto
>[number];

export type EntryWithPhotos = FunctionReturnType<
  typeof api.public.entries.getWithPhotos
>;
