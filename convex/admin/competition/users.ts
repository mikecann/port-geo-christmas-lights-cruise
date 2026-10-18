import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc } from "../../_generated/dataModel";
import {
  competitionAdminMutation,
  competitionAdminQuery,
} from "../../features/common/auth";
import { users } from "../../features/users/model";

// Only what the People page shows
const toPerson = (user: Doc<"users">) => ({
  _id: user._id,
  _creationTime: user._creationTime,
  name: user.name,
  email: user.email,
  image: user.image,
  isCompetitionAdmin: user.isCompetitionAdmin === true,
  isSystemAdmin: user.isSystemAdmin === true,
});

export type Person = ReturnType<typeof toPerson>;

export const listAdmins = competitionAdminQuery
  .input({})
  .handler(async (context) =>
    (await users.listAdmins(context.db)).map(toPerson),
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
    return { ...result, page: result.page.map(toPerson) };
  })
  .public();

export const search = competitionAdminQuery
  .input({ text: v.string() })
  .handler(async (context, input) => {
    const text = input.text.trim();
    if (!text) return [];
    return (await users.search(context.db, text)).map(toPerson);
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
