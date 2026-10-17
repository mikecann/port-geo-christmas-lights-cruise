import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import {
  createConvexTest,
  createConvexTestWithUser,
  createTestEntry,
  createTestUser,
  getTheOnlyTestEntry,
  moveEntryToStatus,
  signInAsTestUser,
} from "../common/tests/testingHelpers";
import {
  MAX_ENTRY_ADDRESS_LENGTH,
  MAX_ENTRY_NAME_LENGTH,
  MAX_REJECTED_REASON_LENGTH,
} from "../../../shared/constants";

describe("entry text length limits", () => {
  it("trims draft names and addresses and accepts them at the limit", async () => {
    const { t } = await createConvexTestWithUser();
    await createTestEntry(t);
    const name = "n".repeat(MAX_ENTRY_NAME_LENGTH);
    const address = "a".repeat(MAX_ENTRY_ADDRESS_LENGTH);

    await t.mutation(api.my.entries.updateDraft, {
      name: `  ${name}  `,
      houseAddress: { address: ` ${address} `, placeId: "pid" },
    });

    expect(await getTheOnlyTestEntry(t)).toMatchObject({
      name,
      houseAddress: { address, placeId: "pid" },
    });
  });

  it("rejects draft names and addresses over the limit", async () => {
    const { t } = await createConvexTestWithUser();
    await createTestEntry(t);

    await expect(
      t.mutation(api.my.entries.updateDraft, {
        name: "n".repeat(MAX_ENTRY_NAME_LENGTH + 1),
      }),
    ).rejects.toThrow("The entry name must be 80 characters or fewer.");
    await expect(
      t.mutation(api.my.entries.updateDraft, {
        houseAddress: {
          address: "a".repeat(MAX_ENTRY_ADDRESS_LENGTH + 1),
          placeId: "pid",
        },
      }),
    ).rejects.toThrow("The address must be 200 characters or fewer.");
  });

  it("rejects an approved entry's new name over the limit", async () => {
    const { t } = await createConvexTestWithUser();
    const entry = await createTestEntry(t);
    if (!entry) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, { entryId: entry._id, status: "approved" });

    await expect(
      t.mutation(api.my.entries.updateApproved, {
        name: "n".repeat(MAX_ENTRY_NAME_LENGTH + 1),
      }),
    ).rejects.toThrow("The entry name must be 80 characters or fewer.");
  });

  it("rejects a rejection reason over the limit", async () => {
    const t = createConvexTest();
    const asEntrant = signInAsTestUser(t, await createTestUser(t));
    const entry = await createTestEntry(asEntrant);
    if (!entry) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, { entryId: entry._id, status: "submitted" });
    const admin = await createTestUser(t, {
      user: { isCompetitionAdmin: true },
    });

    await expect(
      signInAsTestUser(t, admin).mutation(
        api.admin.competition.entries.reject,
        {
          entryId: entry._id,
          rejectedReason: "r".repeat(MAX_REJECTED_REASON_LENGTH + 1),
        },
      ),
    ).rejects.toThrow("The rejection reason must be 1000 characters or fewer.");
    expect(await getTheOnlyTestEntry(t)).toMatchObject({ status: "submitted" });
  });
});
