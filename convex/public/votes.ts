import { v } from "convex/values";
import { convex } from "../schema";
import { competitions } from "../features/competitions/model";
import { checkVoterLocation } from "../features/votes/location";
import { locationCheckValidator } from "../features/votes/schema";

// Lets the vote page say up front whether a vote can count as in person, and
// ask whether they've seen it only when it can. The vote mutation checks again.
export const inPersonCheck = convex
  .query()
  .input({ geoToken: v.optional(v.string()) })
  .returns(
    v.object({
      locationCheck: locationCheckValidator,
      area: v.object({ countries: v.array(v.string()), waOnly: v.boolean() }),
    }),
  )
  .handler(async (context, input) => {
    const competition = await competitions.query(context).current();
    const area = competitions.inPersonArea(competition);
    const { locationCheck } = await checkVoterLocation(
      area,
      input.geoToken,
      Date.now(),
    );
    return { locationCheck, area };
  })
  .public();
