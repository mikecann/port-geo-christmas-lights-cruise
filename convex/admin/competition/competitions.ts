import {
  competitionAdminMutation,
  competitionAdminQuery,
} from "../../features/common/auth";
import { competitions } from "../../features/competitions/model";
import { v } from "convex/values";

const entryNumberRangeValidator = v.object({
  min: v.number(),
  max: v.number(),
});

export const getEntryNumberRange = competitionAdminQuery
  .input({})
  .returns(entryNumberRangeValidator)
  .handler(async (context) =>
    competitions.entryNumberRange(await competitions.query(context).current()),
  )
  .public();

export const setEntryNumberRange = competitionAdminMutation
  .input({ min: v.number(), max: v.number() })
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await competitions
      .mutate(context)
      .setEntryNumberRange(competition._id, input);
    return null;
  })
  .public();

const inPersonAreaValidator = v.object({
  countries: v.array(v.string()),
  waOnly: v.boolean(),
});

export const getInPersonArea = competitionAdminQuery
  .input({})
  .returns(inPersonAreaValidator)
  .handler(async (context) =>
    competitions.inPersonArea(await competitions.query(context).current()),
  )
  .public();

export const setInPersonArea = competitionAdminMutation
  .input(inPersonAreaValidator.fields)
  .returns(v.null())
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    await competitions.mutate(context).setInPersonArea(competition._id, input);
    return null;
  })
  .public();
