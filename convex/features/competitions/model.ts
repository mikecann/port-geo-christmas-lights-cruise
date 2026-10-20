import type { Doc, Id } from "../../_generated/dataModel";
import type { DatabaseReader, MutationCtx } from "../../_generated/server";
import { ensure } from "../../../shared/ensure";
import { ConvexError } from "convex/values";
import {
  DEFAULT_ENTRY_NUMBER_RANGE,
  DEFAULT_IN_PERSON_AREA,
} from "../../../shared/constants";
import {
  ensureValidEntryNumberRange,
  type EntryNumberRange,
} from "../entries/numbers";

export type InPersonArea = { countries: string[]; waOnly: boolean };

export const competitions = {
  inPersonArea(competition: Doc<"competitions">): InPersonArea {
    return {
      countries:
        competition.inPersonCountries ?? DEFAULT_IN_PERSON_AREA.countries,
      waOnly: competition.inPersonWaOnly ?? DEFAULT_IN_PERSON_AREA.waOnly,
    };
  },

  entryNumberRange(competition: Doc<"competitions">): EntryNumberRange {
    return {
      min: competition.entryNumberMin ?? DEFAULT_ENTRY_NUMBER_RANGE.min,
      max: competition.entryNumberMax ?? DEFAULT_ENTRY_NUMBER_RANGE.max,
    };
  },

  // Only reads, so a machine's guards and effects can use it too
  query(ctx: { db: DatabaseReader }) {
    return {
      forYear(year: number) {
        return {
          find() {
            return ctx.db
              .query("competitions")
              .withIndex("by_year", (q) => q.eq("year", year))
              .unique();
          },

          async get() {
            return ensure(
              await this.find(),
              `Competition for ${year} has not been configured`,
            );
          },
        };
      },

      forCompetition(competitionId: Id<"competitions">) {
        return {
          async get() {
            return ensure(
              await ctx.db.get(competitionId),
              `Competition '${competitionId}' not found`,
            );
          },
        };
      },

      // The newest year is the current competition, so adding next year's
      // row is what moves the site on
      async current() {
        const [newest] = await this.listNewestFirst(1);
        return ensure(newest, "No competition has been configured");
      },

      listNewestFirst(limit = 100) {
        return ctx.db
          .query("competitions")
          .withIndex("by_year")
          .order("desc")
          .take(limit);
      },

      listBeforeYear(year: number, limit = 100) {
        return ctx.db
          .query("competitions")
          .withIndex("by_year", (q) => q.lt("year", year))
          .order("desc")
          .take(limit);
      },
    };
  },

  mutate(ctx: MutationCtx) {
    return {
      async setEntriesOpen(
        competitionId: Id<"competitions">,
        entriesOpen: boolean,
      ) {
        await competitions.query(ctx).forCompetition(competitionId).get();
        await ctx.db.patch(competitionId, { entriesOpen });
      },

      async setVotingOpen(
        competitionId: Id<"competitions">,
        votingOpen: boolean,
      ) {
        await competitions.query(ctx).forCompetition(competitionId).get();
        await ctx.db.patch(competitionId, { votingOpen });
      },

      async setEntryNumberRange(
        competitionId: Id<"competitions">,
        range: EntryNumberRange,
      ) {
        await competitions.query(ctx).forCompetition(competitionId).get();
        const { min, max } = ensureValidEntryNumberRange(range);
        await ctx.db.patch(competitionId, {
          entryNumberMin: min,
          entryNumberMax: max,
        });
      },

      async setInPersonArea(
        competitionId: Id<"competitions">,
        area: InPersonArea,
      ) {
        await competitions.query(ctx).forCompetition(competitionId).get();
        // Two-letter codes like Cloudflare reports, e.g. AU
        const countries = [
          ...new Set(area.countries.map((c) => c.trim().toUpperCase())),
        ];
        if (countries.length === 0)
          throw new ConvexError("Add at least one country, like AU.");
        const badCode = countries.find((c) => !/^[A-Z]{2}$/.test(c));
        if (badCode !== undefined)
          throw new ConvexError(
            `"${badCode}" isn't a two-letter country code, like AU.`,
          );
        await ctx.db.patch(competitionId, {
          inPersonCountries: countries,
          inPersonWaOnly: area.waOnly,
        });
      },
    };
  },
};
