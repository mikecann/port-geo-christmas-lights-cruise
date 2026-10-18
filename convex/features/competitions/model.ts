import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { ensure } from "../../../shared/ensure";

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
    };
  },
};
