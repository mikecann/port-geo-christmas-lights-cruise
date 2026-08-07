import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { ensure } from "../../../shared/ensure";

export const CURRENT_COMPETITION_YEAR = 2026;
export const LEGACY_COMPETITION_YEAR = 2025;

export const competitions = {
  query(ctx: QueryCtx) {
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

      current() {
        return this.forYear(CURRENT_COMPETITION_YEAR).get();
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

      async ensureYear(args: {
        year: number;
        entriesOpen: boolean;
        votingOpen: boolean;
      }) {
        const existing = await competitions
          .query(ctx)
          .forYear(args.year)
          .find();
        if (existing) return existing;
        const competitionId = await ctx.db.insert("competitions", args);
        return ensure(await ctx.db.get(competitionId));
      },

      ensureCurrent() {
        return this.ensureYear({
          year: CURRENT_COMPETITION_YEAR,
          entriesOpen: true,
          votingOpen: false,
        });
      },

      ensureLegacy() {
        return this.ensureYear({
          year: LEGACY_COMPETITION_YEAR,
          entriesOpen: false,
          votingOpen: false,
        });
      },
    };
  },
};
