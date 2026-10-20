import { ConvexError } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { internal } from "../../../shared/api";
import { photos } from "../photos/model";
import { votes } from "../votes/model";
import {
  MAX_ENTRY_ADDRESS_LENGTH,
  MAX_ENTRY_NAME_LENGTH,
  MAX_REJECTED_REASON_LENGTH,
} from "../../../shared/constants";
import { competitions } from "../competitions/model";
import { entry as entryMachine } from "../../machines";
import type { ApprovedEntryDoc, PublicEntry } from "./schema";
import { ensureValidEntryNumber } from "./numbers";
import { ensureIsModifiable, entriesQuery } from "./queries";

function trimToLimit(value: string, maxLength: number, label: string) {
  const trimmed = value.trim();
  if (trimmed.length > maxLength)
    throw new ConvexError(`${label} must be ${maxLength} characters or fewer.`);
  return trimmed;
}

export { ENTRY_UNAVAILABLE_MESSAGE } from "./queries";

type Refusal = {
  status: "rejected";
  code: "NOT_ALLOWED" | "NOT_ACCEPTED" | "GUARD_BLOCKED";
  reasons: string[];
};

// The entry machine refuses with a result rather than an error. This throws
// it as the ConvexError the page shows. `messages` swaps a guard's reason, by
// the guard's name, or a refusal's code, for a sentence about this entry.
export function ensureStepped<R extends { status: "done" } | Refusal>(
  result: R,
  messages: Partial<Record<string, string>> = {},
): Exclude<R, Refusal> {
  if (result.status === "done") return result as Exclude<R, Refusal>;
  const refusal = result as Refusal;
  const guardOf = new Map(
    Object.entries(entryMachine.manifest.guards).map(([guard, why]) => [
      why,
      guard,
    ]),
  );
  const message =
    refusal.code === "GUARD_BLOCKED"
      ? refusal.reasons
          .map((reason) => messages[guardOf.get(reason) ?? ""] ?? reason)
          .join(" ")
      : (messages[refusal.code] ?? refusal.reasons.join(" "));
  throw new ConvexError(message);
}

export const entries = {
  toPublic(entry: ApprovedEntryDoc): PublicEntry {
    const { address, lat, lng } = entry.state.houseAddress;
    return {
      _id: entry._id,
      competitionId: entry.competitionId,
      name: entry.state.name,
      entryNumber: entry.state.entryNumber,
      houseAddress: { address, lat, lng },
    };
  },

  doc(entry: Doc<"entries">) {
    return { ensureIsModifiable: () => ensureIsModifiable(entry) };
  },

  query: entriesQuery,

  // Changes to an entry's state go through the entry machine
  // (convex/features/entries/machine.ts) as events. These check and tidy
  // what people typed, then send them.
  mutate(context: MutationCtx) {
    const { db } = context;

    return {
      forEntry(entryId: Id<"entries">) {
        const query = entries.query(context).forEntry(entryId);
        return {
          // Returns the number it was given
          async approve() {
            ensureStepped(
              await entryMachine.send(context, entryId, { type: "APPROVE" }),
            );
            const entry = await query.get();
            if (entry.state.kind !== "approved")
              throw new Error(`Entry '${entryId}' wasn't approved`);
            return entry.state.entryNumber;
          },

          async reject({ rejectedReason }: { rejectedReason: string }) {
            ensureStepped(
              await entryMachine.send(context, entryId, {
                type: "REJECT",
                rejectedReason: trimToLimit(
                  rejectedReason,
                  MAX_REJECTED_REASON_LENGTH,
                  "The rejection reason",
                ),
              }),
            );
          },

          // Undoes a rejection, so it's back in the review queue
          async reopen() {
            ensureStepped(
              await entryMachine.send(context, entryId, { type: "REOPEN" }),
              {
                NOT_ACCEPTED:
                  "Only rejected entries can be sent back for review.",
              },
            );
          },

          // Its photos and votes go too. The row goes through purge, which
          // needs the machine's internal brand, so it's a nested mutation.
          async delete() {
            await query.get();
            await photos.forEntry(entryId).deleteAll(context);
            await votes.forEntry(entryId).deleteAll(context.db);
            await context.runMutation(internal.entries.purge, { entryId });
          },

          // For admins, so the number must be free in the competition
          async overrideEntryNumber(entryNumber: number) {
            ensureValidEntryNumber(entryNumber);
            ensureStepped(
              await entryMachine.send(context, entryId, {
                type: "SET_NUMBER",
                entryNumber,
              }),
              {
                NOT_ACCEPTED: "Rejected entries don't have a number.",
                numberIsFree: `Number ${entryNumber} is already used by another entry this year.`,
              },
            );
          },

          // For someone who signed in with a different account this year. The
          // entry takes the previous entry's number.
          async linkPreviousEntry(previousEntryId: Id<"entries">) {
            const previous = await entries
              .query(context)
              .forEntry(previousEntryId)
              .findApproved();
            ensureStepped(
              await entryMachine.send(context, entryId, {
                type: "LINK_PREVIOUS",
                previousEntryId,
              }),
              {
                NOT_ACCEPTED:
                  "Rejected entries can't be linked to a previous entry.",
                previousNumberIsFree: `Number ${previous?.state.entryNumber} is already used by another entry this year.`,
              },
            );
          },
        };
      },

      forUser(competitionId: Id<"competitions">, userId: Id<"users">) {
        const query = entries.query(context).forUser(competitionId, userId);
        return {
          async create() {
            const previousEntry = await query.findPreviousApproved();
            const { id } = ensureStepped(
              await entryMachine.create(
                context,
                {
                  competitionId,
                  submittedByUserId: userId,
                  ...(previousEntry
                    ? { previousEntryId: previousEntry._id }
                    : {}),
                },
                { type: "ENTER" },
              ),
            );
            return id;
          },

          async updateBeforeSubmission(args: {
            houseAddress?: { address: string; placeId: string };
            name?: string;
          }) {
            const entry = await query.get();
            ensureStepped(
              await entryMachine.send(context, entry._id, {
                type: "EDIT",
                ...(args.houseAddress === undefined
                  ? {}
                  : {
                      houseAddress: {
                        address: trimToLimit(
                          args.houseAddress.address,
                          MAX_ENTRY_ADDRESS_LENGTH,
                          "The address",
                        ),
                        placeId: args.houseAddress.placeId,
                      },
                    }),
                ...(args.name === undefined
                  ? {}
                  : {
                      name: trimToLimit(
                        args.name,
                        MAX_ENTRY_NAME_LENGTH,
                        "The entry name",
                      ),
                    }),
              }),
              {
                NOT_ACCEPTED:
                  "Your entry has already been submitted, so it can't be changed here.",
              },
            );
          },

          async updateApproved(args: { name?: string }) {
            const entry = await query.get();
            const renameRefusals = {
              NOT_ACCEPTED:
                "Your entry can only be renamed once it's been approved.",
            };
            if (args.name === undefined) {
              if (entry.state.kind !== "approved")
                throw new ConvexError(renameRefusals.NOT_ACCEPTED);
              return;
            }
            ensureStepped(
              await entryMachine.send(context, entry._id, {
                type: "RENAME",
                name: trimToLimit(
                  args.name,
                  MAX_ENTRY_NAME_LENGTH,
                  "The entry name",
                ),
              }),
              renameRefusals,
            );
          },

          async remove() {
            const entry = await query.get();

            if (entry.state.kind !== "draft")
              throw new ConvexError(
                "Your entry can only be deleted while it's a draft.",
              );

            await entries.mutate(context).forEntry(entry._id).delete();
          },

          // The submit action's first step: it holds the address while the
          // action looks it up
          async startSubmitting() {
            const entry = await query.get();
            const address = entry.state.houseAddress?.address;
            ensureStepped(
              await entryMachine.send(context, entry._id, { type: "SUBMIT" }),
              {
                NOT_ACCEPTED: "Your entry has already been submitted.",
                addressIsFree: `Address ${address} is already used!`,
              },
            );
            return await query.get();
          },
        };
      },

      // Only ever the current competition, so past seasons can't be wiped
      async wipeCurrentCompetition() {
        const competition = await competitions.query(context).current();
        const allEntries = await db
          .query("entries")
          .withIndex("by_competitionId_and_status", (q) =>
            q.eq("competitionId", competition._id),
          )
          .collect();
        let deletedCount = 0;
        for (const entry of allEntries) {
          // Use the proper delete method to clean up photos
          await entries.mutate(context).forEntry(entry._id).delete();
          deletedCount++;
        }
        return { deletedCount };
      },
    };
  },
};
