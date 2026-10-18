import type { Doc } from "../_generated/dataModel";
import { optionalUserQuery } from "../features/common/auth";

export const find = optionalUserQuery
  .input({})
  .handler(async (context): Promise<Me | null> => context.user)
  .public();

export type Me = Doc<"users">;
