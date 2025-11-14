import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { entryTable } from "./features/entries/schema";
import { voteTable } from "./features/votes/schema";
import { usersTable } from "./features/users/schema";
import { photoTable } from "./features/photos/schema";
import { doc, typedV, partial } from "convex-helpers/validators";
import { createBuilder } from "fluent-convex";

const schema = defineSchema({
  ...authTables,
  users: usersTable,
  entries: entryTable,
  votes: voteTable,
  photos: photoTable,
});

export default schema;

export const vv = typedV(schema);

export const convex = createBuilder(schema);
