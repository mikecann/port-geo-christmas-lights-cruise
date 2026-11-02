import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc, Id } from "../../_generated/dataModel";
import type { DatabaseReader } from "../../_generated/server";
import {
  competitionAdminMutation,
  competitionAdminQuery,
} from "../../features/common/auth";
import { users } from "../../features/users/model";
import { competitions } from "../../features/competitions/model";

// Only what the People page shows, with this year's entry and vote count so
// staff can see who someone is to the competition. Each is one indexed read
// (someone has at most one entry a year and a vote per category), so a page of
// people stays cheap.
const toPerson = async (
  db: DatabaseReader,
  competitionId: Id<"competitions">,
  user: Doc<"users">,
) => {
  const entry = await db
    .query("entries")
    .withIndex("by_competitionId_and_submittedByUserId", (q) =>
      q.eq("competitionId", competitionId).eq("submittedByUserId", user._id),
    )
    .unique();
  const votes = await db
    .query("votes")
    .withIndex("by_votingUserId_and_competitionId_and_category", (q) =>
      q.eq("votingUserId", user._id).eq("competitionId", competitionId),
    )
    .collect();
  return {
    _id: user._id,
    _creationTime: user._creationTime,
    name: user.name,
    email: user.email,
    image: user.image,
    isCompetitionAdmin: user.isCompetitionAdmin === true,
    isSystemAdmin: user.isSystemAdmin === true,
    entry: entry
      ? {
          entryId: entry._id,
          name: entry.state.name ?? "",
          // A rejected entry's number goes back in the pool
          entryNumber:
            entry.state.kind === "rejected"
              ? undefined
              : entry.state.entryNumber,
          status: entry.state.kind,
        }
      : null,
    voteCount: votes.length,
  };
};

export type Person = Awaited<ReturnType<typeof toPerson>>;

const toPeople = async (
  context: { db: DatabaseReader },
  list: Doc<"users">[],
) => {
  const competition = await competitions.query(context).current();
  return await Promise.all(
    list.map((user) => toPerson(context.db, competition._id, user)),
  );
};

export const listAdmins = competitionAdminQuery
  .input({})
  .handler(
    async (context) =>
      await toPeople(context, await users.listAdmins(context.db)),
  )
  .public();

// Newest first
export const listPage = competitionAdminQuery
  .input({ paginationOpts: paginationOptsValidator })
  .handler(async (context, input) => {
    const result = await context.db
      .query("users")
      .order("desc")
      .paginate(input.paginationOpts);
    return { ...result, page: await toPeople(context, result.page) };
  })
  .public();

export const search = competitionAdminQuery
  .input({ text: v.string() })
  .handler(async (context, input) => {
    const text = input.text.trim();
    if (!text) return [];
    return await toPeople(context, await users.search(context.db, text));
  })
  .public();

// Competition admins can add each other, so ARG can bring in their own people
export const setCompetitionAdmin = competitionAdminMutation
  .input({ userId: v.id("users"), enabled: v.boolean() })
  .returns(v.null())
  .handler(async (context, input) => {
    if (input.userId === context.userId && !input.enabled)
      throw new ConvexError(
        "You can't remove your own admin access. Ask another admin to do it.",
      );
    await context.db.patch(input.userId, {
      isCompetitionAdmin: input.enabled ? true : undefined,
    });
    return null;
  })
  .public();
