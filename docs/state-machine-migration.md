# Moving entries onto the state machine

Entries used to be a table whose whole row was a union keyed on `status`, with each status's fields at the top level. Now each row keeps its status and that status's fields in one `state` field, run by the entry machine ([diagram](entry-machine.md), `convex/features/entries/machine.ts`), with its timers beside it in `stateTimers`.

Production has real entries in the old shape, and Convex checks every row against the schema when you deploy, so this goes out in three deploys. Merging to `main` is a deploy (the Cloudflare build runs `convex deploy` against production), so each deploy is its own PR, merged once the step before it is done. Nobody should be creating or editing entries while this happens: entries are closed, so that holds.

The migrations are in `convex/migrations/entryState.ts`. Each does one page of entries and schedules the next, and running one again only changes the rows that need it. They write `state` directly, round the machine, so nothing runs a guard or an effect and no history is recorded: history starts from each entry's first step after the move.

Commands use `--deployment production` (see the README: don't use `--prod` while the old US deployment is still around).

## Deploy 1: add `state` beside the old fields

Ship the old code with two changes:

- `@convex-dev/state-machines` installed, so `machineTimers` can be imported. The component (`app.use(stateMachines)`) isn't needed yet.
- `convex/migrations/entryState.ts` with `backfillState` only. It doesn't use the machine. It does import `entryState` from `convex/features/entries/schema.ts`, so add that validator there. The package's lint rules aren't on yet, so the file can't mention them in `eslint-disable` comments.

And `convex/features/entries/schema.ts` keeps the old union, with `state` and `stateTimers` optional on every member. Its indexes stay as they are:

```ts
import { machineTimers } from "@convex-dev/state-machines";

// entryState: as convex/features/entries/schema.ts defines it now
const duringMigration = {
  state: v.optional(entryState),
  stateTimers: v.optional(machineTimers),
};

export const entrySchema = v.union(
  v.object({
    ...commonEntryFields,
    ...duringMigration,
    status: v.literal("draft"),
    houseAddress: v.optional(draftHomeAddressValidator),
    name: v.optional(v.string()),
    entryNumber: reservedEntryNumber,
  }),
  v.object({
    ...commonEntryFields,
    ...duringMigration,
    status: v.literal("submitting"),
    houseAddress: draftHomeAddressValidator,
    name: v.string(),
    entryNumber: reservedEntryNumber,
  }),
  v.object({
    ...commonEntryFields,
    ...duringMigration,
    status: v.literal("submitted"),
    submittedAt: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
    entryNumber: reservedEntryNumber,
  }),
  v.object({
    ...commonEntryFields,
    ...duringMigration,
    status: v.literal("approved"),
    submittedAt: v.number(),
    approvedAt: v.number(),
    entryNumber: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
  }),
  v.object({
    ...commonEntryFields,
    ...duringMigration,
    status: v.literal("rejected"),
    rejectedAt: v.number(),
    rejectedReason: v.string(),
    submittedAt: v.number(),
    houseAddress: homeAddressValidator,
    name: v.string(),
    entryNumber: reservedEntryNumber,
  }),
);

export const entryTable = defineTable(entrySchema)
  .index("by_competitionId_and_status", ["competitionId", "status"])
  .index("by_competitionId_and_submittedByUserId", [
    "competitionId",
    "submittedByUserId",
  ])
  .index("by_competitionId_and_entryNumber", ["competitionId", "entryNumber"])
  .index("by_competitionId_and_homeAddress_placeId", [
    "competitionId",
    "houseAddress.placeId",
  ]);
```

Once it's live, give every row its state:

```bash
npx convex run --deployment production migrations/entryState:backfillState
```

It returns the first page's count and schedules the rest. Check the logs, or the `entries` table in the dashboard, until every row has a `state`.

The old code doesn't keep `state` up to date: approving, rejecting, renumbering, editing a draft and renaming an approved entry all still work while entries are closed. So `backfillState` works each row's state out again on every run, and only counts the rows it changed. Run it again last thing before merging deploy 2, and don't approve or edit entries until deploy 2 is live. Never run it after deploy 2: from then on the old fields are stale and `state` is the one to trust, which is why deploy 2 replaces it with `stripOldFields`.

## Deploy 2: the new code, with the old fields still allowed

Ship the new code (the machine, the component in `convex.config.ts`, the package's lint rules, and everything that reads `state`), with `backfillState` swapped for `stripOldFields`, and with the schema below instead of the final one: `state` and `stateTimers` required, and the old fields allowed as optional until they're stripped. The indexes move to the fields inside `state`. Convex refuses this deploy if any row still lacks a `state`, so a missed backfill can't slip through.

```ts
export const entryTable = defineTable({
  // eslint-disable-next-line machines/no-optional-on-machine-tables -- previousEntryId is optional in every state: a new entrant has no previous entry, and entries from before the field existed were never linked
  ...commonEntryFields,
  state: entryState,
  stateTimers: machineTimers,
  // The old fields, until migrations/entryState:stripOldFields removes them
  /* eslint-disable machines/no-optional-on-machine-tables -- the old top-level fields, kept only until stripOldFields has run */
  status: v.optional(
    v.union(
      v.literal("draft"),
      v.literal("submitting"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
  ),
  houseAddress: v.optional(
    v.union(homeAddressValidator, draftHomeAddressValidator),
  ),
  name: v.optional(v.string()),
  entryNumber: v.optional(v.number()),
  submittedAt: v.optional(v.number()),
  approvedAt: v.optional(v.number()),
  rejectedAt: v.optional(v.number()),
  rejectedReason: v.optional(v.string()),
  /* eslint-enable machines/no-optional-on-machine-tables */
})
  .index("by_competitionId_and_status", ["competitionId", "state.kind"])
  .index("by_competitionId_and_submittedByUserId", [
    "competitionId",
    "submittedByUserId",
  ])
  .index("by_competitionId_and_entryNumber", [
    "competitionId",
    "state.entryNumber",
  ])
  .index("by_competitionId_and_homeAddress_placeId", [
    "competitionId",
    "state.houseAddress.placeId",
  ]);
```

(`convex/migrations/entryState.test.ts` runs the migrations against exactly these two schemas.)

Once it's live, remove the old fields:

```bash
npx convex run --deployment production migrations/entryState:stripOldFields
```

### Is `armTimers` needed?

Only if a backfilled row is in `submitting`. A row the backfill put in `submitting` has no timer, so nothing would ever send it back to draft, and it keeps holding its address: the bug the timer fixes. Nothing else needs one, as `submitting` is the only state with a timer.

Today an entry is only in `submitting` for the second or two its submit action runs, unless that action died, so there should be none. To be sure, run this after deploy 2. It arms the timer on any entry in `submitting` that has none (as if it had just entered the state, so it goes back to draft 10 minutes later), and does nothing otherwise:

```bash
npx convex run --deployment production migrations/entryTimers:armSubmittingTimers
```

`{ updated: 0 }` on every page means there were none.

## Deploy 3: drop the old fields

Ship the schema as it is in `convex/features/entries/schema.ts` now: the deploy 2 schema without the old fields. Convex refuses it if any row still has one, so run `stripOldFields` to the end first. The migration files can stay, as running them again does nothing, or be deleted in a later change.
