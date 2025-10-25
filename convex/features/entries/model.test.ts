import { describe, it, expect, beforeEach } from "vitest";
import type {
  ConvexTest,
  AuthenticatedConvexTest,
} from "../common/tests/testingHelpers";
import {
  createConvexTest,
  createTestUser,
  createTestEntry,
  moveEntryToStatus,
  signInAsTestUser,
} from "../common/tests/testingHelpers";
import { entries } from "./model";
import type { Doc } from "../../_generated/dataModel";

describe("getNextAvailableEntryNumber", () => {
  let rawTest: ConvexTest;
  let t: AuthenticatedConvexTest;
  let user: Doc<"users">;

  beforeEach(async () => {
    rawTest = createConvexTest();
    user = await createTestUser(rawTest, {});
    t = signInAsTestUser(rawTest, user);
  });

  it("should return a random number between 0-50 when no approved entries exist", async () => {
    const result = await t.run(async (ctx) => {
      return await entries.getNextAvailableEntryNumber(ctx.db);
    });

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(50);
  });

  it("should return a number not already in use", async () => {
    // Arrange - create and approve one entry
    const entry = await createTestEntry(t, {
      submittedByUserId: user._id,
    });
    if (!entry) throw new Error("Failed to create entry");
    await moveEntryToStatus(t, {
      entryId: entry._id,
      status: "approved",
      overrides: {
        houseAddress: { address: "123 Test St", lat: 0, lng: 0 },
        name: "Test Entry",
      },
    });

    // Get the entry number that was assigned
    const approvedEntry = await t.run(async (ctx) => {
      return await entries.forEntry(entry._id).getApproved(ctx.db);
    });

    // Act
    const result = await t.run(async (ctx) => {
      return await entries.getNextAvailableEntryNumber(ctx.db);
    });

    // Assert - should be between 0-50 and not the same as the existing entry
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(50);
    expect(result).not.toBe(approvedEntry.entryNumber);
  });

  it("should return an unused number when multiple approved entries exist", async () => {
    // Arrange - create and approve multiple entries
    const entry1 = await createTestEntry(t, {
      submittedByUserId: user._id,
    });
    const entry2 = await createTestEntry(t, {
      submittedByUserId: user._id,
    });
    const entry3 = await createTestEntry(t, {
      submittedByUserId: user._id,
    });
    if (!entry1 || !entry2 || !entry3)
      throw new Error("Failed to create entries");

    await moveEntryToStatus(t, {
      entryId: entry1._id,
      status: "approved",
      overrides: {
        houseAddress: { address: "123 Test St", lat: 0, lng: 0 },
        name: "Entry 1",
      },
    });
    await moveEntryToStatus(t, {
      entryId: entry2._id,
      status: "approved",
      overrides: {
        houseAddress: { address: "456 Oak St", lat: 0, lng: 0 },
        name: "Entry 2",
      },
    });
    await moveEntryToStatus(t, {
      entryId: entry3._id,
      status: "approved",
      overrides: {
        houseAddress: { address: "789 Pine St", lat: 0, lng: 0 },
        name: "Entry 3",
      },
    });

    // Get all approved entries
    const approvedEntries = await t.run(async (ctx) => {
      return await entries.listApproved(ctx.db);
    });
    const usedNumbers = new Set(approvedEntries.map((e) => e.entryNumber));

    // Act
    const result = await t.run(async (ctx) => {
      return await entries.getNextAvailableEntryNumber(ctx.db);
    });

    // Assert - should be between 0-50 and not already used
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(50);
    expect(usedNumbers.has(result)).toBe(false);
  });

  it("should not be affected by draft or submitted entries", async () => {
    // Arrange - create entries in various states
    const approvedEntry = await createTestEntry(t, {
      submittedByUserId: user._id,
    });
    const draftEntry = await createTestEntry(t, {
      submittedByUserId: user._id,
    });
    const submittedEntry = await createTestEntry(t, {
      submittedByUserId: user._id,
    });
    if (!approvedEntry || !draftEntry || !submittedEntry)
      throw new Error("Failed to create entries");

    await moveEntryToStatus(t, {
      entryId: approvedEntry._id,
      status: "approved",
      overrides: {
        houseAddress: { address: "123 Test St", lat: 0, lng: 0 },
        name: "Approved Entry",
      },
    });
    // draftEntry stays in draft status by default
    await moveEntryToStatus(t, {
      entryId: submittedEntry._id,
      status: "submitted",
      overrides: {
        houseAddress: { address: "456 Oak St", lat: 0, lng: 0 },
        name: "Submitted Entry",
      },
    });

    // Get the approved entry number
    const approved = await t.run(async (ctx) => {
      return await entries.forEntry(approvedEntry._id).getApproved(ctx.db);
    });

    // Act
    const result = await t.run(async (ctx) => {
      return await entries.getNextAvailableEntryNumber(ctx.db);
    });

    // Assert - should be in range and not the same as the one approved entry
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(50);
    expect(result).not.toBe(approved.entryNumber);
  });

  it("should return max + 1 when all numbers 0-50 are taken", async () => {
    // Arrange - create and approve 51 entries to fill all numbers 0-50
    const createdEntries = [];
    for (let i = 0; i <= 50; i++) {
      const entry = await createTestEntry(t, {
        submittedByUserId: user._id,
      });
      if (!entry) throw new Error("Failed to create entry");
      createdEntries.push(entry);
    }

    // Approve all entries with specific entry numbers 0-50
    for (let i = 0; i <= 50; i++)
      await moveEntryToStatus(t, {
        entryId: createdEntries[i]._id,
        status: "approved",
        overrides: {
          houseAddress: {
            address: `${i} Test St`,
            lat: 0,
            lng: 0,
            placeId: `place${i}`,
          },
          name: `Entry ${i}`,
          entryNumber: i,
        },
      });

    // Act
    const result = await t.run(async (ctx) => {
      return await entries.getNextAvailableEntryNumber(ctx.db);
    });

    // Assert - should be 51 (max + 1)
    expect(result).toBe(51);
  });
});

describe("finalizeSubmission", () => {
  let rawTest: ConvexTest;
  let t: AuthenticatedConvexTest;
  let user1: Doc<"users">;
  let user2: Doc<"users">;

  beforeEach(async () => {
    rawTest = createConvexTest();
    user1 = await createTestUser(rawTest, {});
    user2 = await createTestUser(rawTest, {});
    t = signInAsTestUser(rawTest, user1);
  });

  it("should throw an error if another approved entry exists with the same placeId", async () => {
    const sharedPlaceId = "test-place-id-123";

    // Create and approve the first entry with the shared placeId
    const entry1 = await createTestEntry(t, {
      submittedByUserId: user1._id,
    });
    if (!entry1) throw new Error("Failed to create entry1");
    await moveEntryToStatus(t, {
      entryId: entry1._id,
      status: "approved",
      overrides: {
        houseAddress: {
          address: "123 Test St",
          lat: 10,
          lng: 20,
          placeId: sharedPlaceId,
        },
        name: "First Entry",
      },
    });

    // Create a second entry for a different user and move it to "submitting"
    const entry2 = await createTestEntry(t, {
      submittedByUserId: user2._id,
    });
    if (!entry2) throw new Error("Failed to create entry2");

    // Move entry2 to submitting status with the same placeId
    await t.run(async (ctx) => {
      await ctx.db.patch(entry2._id, {
        status: "submitting" as const,
        name: "Second Entry",
        houseAddress: {
          address: "123 Test St",
          placeId: sharedPlaceId,
        },
      });
    });

    // Try to finalize entry2 - should throw an error
    await expect(
      t.run(async (ctx) => {
        await entries.forUser(user2._id).finalizeSubmission(ctx.db, {
          lat: 10,
          lng: 20,
          placeId: sharedPlaceId,
        });
      }),
    ).rejects.toThrow(/already has an approved entry/i);
  });

  it("should allow finalization if no other approved entry exists with the same placeId", async () => {
    const uniquePlaceId = "unique-place-id-456";

    // Create entry and move it to "submitting"
    const entry = await createTestEntry(t, {
      submittedByUserId: user1._id,
    });
    if (!entry) throw new Error("Failed to create entry");

    await t.run(async (ctx) => {
      await ctx.db.patch(entry._id, {
        status: "submitting" as const,
        name: "Test Entry",
        houseAddress: {
          address: "456 Oak St",
          placeId: uniquePlaceId,
        },
      });
    });

    // Finalize should succeed
    await t.run(async (ctx) => {
      await entries.forUser(user1._id).finalizeSubmission(ctx.db, {
        lat: 30,
        lng: 40,
        placeId: uniquePlaceId,
      });
    });

    // Verify the entry was finalized successfully
    const finalizedEntry = await t.run(async (ctx) => {
      return await entries.forEntry(entry._id).get(ctx.db);
    });

    expect(finalizedEntry.status).toBe("submitted");
    if (finalizedEntry.status === "submitted")
      expect(finalizedEntry.houseAddress.placeId).toBe(uniquePlaceId);
  });

  it("should allow finalization if other entries with same placeId are only draft or rejected", async () => {
    const sharedPlaceId = "shared-place-789";

    // Create separate users for each entry to avoid conflicts
    const user3 = await createTestUser(rawTest, {});
    const user4 = await createTestUser(rawTest, {});

    // Create a draft entry with the shared placeId
    const draftEntry = await createTestEntry(t, {
      submittedByUserId: user3._id,
      houseAddress: {
        address: "789 Pine St",
        placeId: sharedPlaceId,
      },
    });

    // Create a rejected entry with the shared placeId
    const rejectedEntry = await createTestEntry(t, {
      submittedByUserId: user4._id,
    });
    if (!rejectedEntry) throw new Error("Failed to create rejectedEntry");
    await t.run(async (ctx) => {
      await ctx.db.patch(rejectedEntry._id, {
        status: "rejected" as const,
        name: "Rejected Entry",
        submittedAt: Date.now(),
        rejectedAt: Date.now(),
        rejectedReason: "Test rejection reason",
        houseAddress: {
          address: "789 Pine St",
          lat: 10,
          lng: 20,
          placeId: sharedPlaceId,
        },
      });
    });

    // Create a new entry to finalize with a different user
    const entryToFinalize = await createTestEntry(t, {
      submittedByUserId: user1._id,
    });
    if (!entryToFinalize) throw new Error("Failed to create entryToFinalize");

    await t.run(async (ctx) => {
      await ctx.db.patch(entryToFinalize._id, {
        status: "submitting" as const,
        name: "Entry To Finalize",
        houseAddress: {
          address: "789 Pine St",
          placeId: sharedPlaceId,
        },
      });
    });

    // Finalize should succeed since only draft and rejected entries exist with this placeId
    await t.run(async (ctx) => {
      await entries.forUser(user1._id).finalizeSubmission(ctx.db, {
        lat: 30,
        lng: 40,
        placeId: sharedPlaceId,
      });
    });

    // Verify the entry was finalized successfully
    const finalizedEntry = await t.run(async (ctx) => {
      return await entries.forEntry(entryToFinalize._id).get(ctx.db);
    });

    expect(finalizedEntry.status).toBe("submitted");
  });

  it("should throw an error if a submitting entry exists with the same placeId", async () => {
    const sharedPlaceId = "test-place-submitting-456";

    // Create and move an entry to submitting status with the shared placeId
    const entry1 = await createTestEntry(t, {
      submittedByUserId: user1._id,
    });
    if (!entry1) throw new Error("Failed to create entry1");

    await t.run(async (ctx) => {
      await ctx.db.patch(entry1._id, {
        status: "submitting" as const,
        name: "First Submitting Entry",
        houseAddress: {
          address: "456 Oak St",
          placeId: sharedPlaceId,
        },
      });
    });

    // Create a second entry for a different user
    const entry2 = await createTestEntry(t, {
      submittedByUserId: user2._id,
    });
    if (!entry2) throw new Error("Failed to create entry2");

    // Move entry2 to submitting status with the same placeId
    await t.run(async (ctx) => {
      await ctx.db.patch(entry2._id, {
        status: "submitting" as const,
        name: "Second Entry",
        houseAddress: {
          address: "456 Oak St",
          placeId: sharedPlaceId,
        },
      });
    });

    // Try to finalize entry2 - should throw an error because entry1 is already submitting
    await expect(
      t.run(async (ctx) => {
        await entries.forUser(user2._id).finalizeSubmission(ctx.db, {
          lat: 10,
          lng: 20,
          placeId: sharedPlaceId,
        });
      }),
    ).rejects.toThrow(/already has an approved entry/i);
  });

  it("should throw an error if a submitted entry exists with the same placeId", async () => {
    const sharedPlaceId = "test-place-submitted-789";

    // Create and submit an entry with the shared placeId
    const entry1 = await createTestEntry(t, {
      submittedByUserId: user1._id,
    });
    if (!entry1) throw new Error("Failed to create entry1");
    await moveEntryToStatus(t, {
      entryId: entry1._id,
      status: "submitted",
      overrides: {
        houseAddress: {
          address: "789 Elm St",
          lat: 15,
          lng: 25,
          placeId: sharedPlaceId,
        },
        name: "Submitted Entry",
      },
    });

    // Create a second entry for a different user
    const entry2 = await createTestEntry(t, {
      submittedByUserId: user2._id,
    });
    if (!entry2) throw new Error("Failed to create entry2");

    // Move entry2 to submitting status with the same placeId
    await t.run(async (ctx) => {
      await ctx.db.patch(entry2._id, {
        status: "submitting" as const,
        name: "Second Entry",
        houseAddress: {
          address: "789 Elm St",
          placeId: sharedPlaceId,
        },
      });
    });

    // Try to finalize entry2 - should throw an error because entry1 is already submitted
    await expect(
      t.run(async (ctx) => {
        await entries.forUser(user2._id).finalizeSubmission(ctx.db, {
          lat: 15,
          lng: 25,
          placeId: sharedPlaceId,
        });
      }),
    ).rejects.toThrow(/already has an approved entry/i);
  });
});
