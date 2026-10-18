import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { entryTable } from "./features/entries/schema";
import { usedGeoTokenTable, voteTable } from "./features/votes/schema";
import { usersTable } from "./features/users/schema";
import { photoTable } from "./features/photos/schema";
import { typedV } from "convex-helpers/validators";
import { createBuilder } from "fluent-convex";
import type { DataModel } from "./_generated/dataModel";
import { competitionTable } from "./features/competitions/schema";

const schema = defineSchema({
  ...authTables,
  users: usersTable,
  entries: entryTable,
  votes: voteTable,
  usedGeoTokens: usedGeoTokenTable,
  photos: photoTable,
  competitions: competitionTable,
});

export default schema;

export const vv = typedV(schema);

export const convex = createBuilder<DataModel>();
