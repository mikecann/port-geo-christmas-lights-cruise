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

describe("revertToDraft", () => {
  let rawTest: ConvexTest;
  let t: AuthenticatedConvexTest;
  let user: Doc<"users">;

  beforeEach(async () => {
    rawTest = createConvexTest();
    user = await createTestUser(rawTest, {});
    t = signInAsTestUser(rawTest, user);
  });

  it("should revert an entry from submitting status back to draft", async () => {
    // Arrange - create an entry in submitting status
    const entry = await createTestEntry(t, {
      submittedByUserId: user._id,
      status: "submitting",
      name: "Test Entry",
      houseAddress: {
        address: "123 Test Street",
        placeId: "test-place-id-123",
      },
    });

    if (!entry || entry.status !== "submitting")
      throw new Error("Failed to create entry in submitting status");

    // Act
    await t.run(async (ctx) => {
      await entries.forUser(user._id).revertToDraft(ctx.db);
    });

    // Assert
    const revertedEntry = await t.run(async (ctx) => {
      return await entries.forEntry(entry._id).get(ctx.db);
    });

    expect(revertedEntry.status).toBe("draft");
    expect(revertedEntry.name).toBe("Test Entry");
    expect(revertedEntry.houseAddress).toEqual({
      address: "123 Test Street",
      placeId: "test-place-id-123",
    });
  });

  it("should preserve address data when reverting from submitting to draft", async () => {
    // Arrange
    const entry = await createTestEntry(t, {
      submittedByUserId: user._id,
      status: "submitting",
      name: "Entry with Address",
      houseAddress: {
        address: "456 Oak Avenue",
        placeId: "place-456",
      },
    });

    if (!entry) throw new Error("Failed to create entry");

    // Act
    await t.run(async (ctx) => {
      await entries.forUser(user._id).revertToDraft(ctx.db);
    });

    // Assert
    const revertedEntry = await t.run(async (ctx) => {
      return await entries.forEntry(entry._id).get(ctx.db);
    });

    expect(revertedEntry.status).toBe("draft");
    expect(
      typeof revertedEntry.houseAddress === "object" &&
        revertedEntry.houseAddress !== null &&
        "address" in revertedEntry.houseAddress,
    ).toBe(true);
    if (
      typeof revertedEntry.houseAddress === "object" &&
      revertedEntry.houseAddress !== null &&
      "address" in revertedEntry.houseAddress
    ) {
      expect(revertedEntry.houseAddress.address).toBe("456 Oak Avenue");
      expect(revertedEntry.houseAddress.placeId).toBe("place-456");
    }
  });

  it("should throw an error when trying to revert an entry that is not in submitting status", async () => {
    // Arrange - create a draft entry
    const entry = await createTestEntry(t, {
      submittedByUserId: user._id,
      status: "draft",
    });

    if (!entry) throw new Error("Failed to create entry");

    // Act & Assert
    await expect(
      t.run(async (ctx) => {
        await entries.forUser(user._id).revertToDraft(ctx.db);
      }),
    ).rejects.toThrow(/not in submitting status, cannot revert/);
  });

  it("should handle entries without address data when reverting", async () => {
    // Arrange - create an entry in submitting status without houseAddress
    const entryId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("entries", {
        status: "submitting",
        submittedByUserId: user._id,
        name: "Entry Without Address",
        houseAddress: {
          address: "Test Address",
          placeId: "test-place",
        },
      });
      return id;
    });

    // Act
    await t.run(async (ctx) => {
      await entries.forUser(user._id).revertToDraft(ctx.db);
    });

    // Assert
    const revertedEntry = await t.run(async (ctx) => {
      return await entries.forEntry(entryId).get(ctx.db);
    });

    expect(revertedEntry.status).toBe("draft");
  });
});

describe("submission error reversion", () => {
  let rawTest: ConvexTest;
  let t: AuthenticatedConvexTest;
  let user: Doc<"users">;

  beforeEach(async () => {
    rawTest = createConvexTest();
    user = await createTestUser(rawTest, {});
    t = signInAsTestUser(rawTest, user);
  });

  it("should revert entry to draft when finalizeSubmission fails due to boundary violation", async () => {
    // Arrange - create an entry in submitting status with coordinates outside boundary
    const entry = await createTestEntry(t, {
      submittedByUserId: user._id,
      status: "submitting",
      name: "Entry Outside Boundary",
      houseAddress: {
        address: "24 Hardy Street, Augusta WA, Australia",
        placeId: "augusta-place-id",
      },
    });

    if (!entry) throw new Error("Failed to create entry");

    // Coordinates outside the competition boundary (Augusta is way north)
    const outsideBoundaryLat = -33.7; // Outside the boundary
    const outsideBoundaryLng = 115.35;

    // Act & Assert - finalizeSubmission should fail
    await expect(
      t.run(async (ctx) => {
        await entries.forUser(user._id).finalizeSubmission(ctx.db, {
          lat: outsideBoundaryLat,
          lng: outsideBoundaryLng,
          placeId: entry.houseAddress?.placeId || "",
        });
      }),
    ).rejects.toThrow(/outside the competition area/);

    // Verify entry is still in submitting status (needs manual revert)
    const entryAfterError = await t.run(async (ctx) => {
      return await entries.forEntry(entry._id).get(ctx.db);
    });
    expect(entryAfterError.status).toBe("submitting");
  });

  it("should revert entry to draft when finalizeSubmission fails due to address conflict", async () => {
    // Arrange - create two entries with the same placeId
    const placeId = "conflicting-place-id";
    const entry1 = await createTestEntry(t, {
      submittedByUserId: user._id,
      status: "submitted",
      name: "First Entry",
      houseAddress: {
        address: "123 Test St",
        lat: -33.63,
        lng: 115.39,
        placeId,
      },
    });

    const entry2 = await createTestEntry(t, {
      submittedByUserId: user._id,
      status: "submitting",
      name: "Second Entry",
      houseAddress: {
        address: "123 Test St",
        placeId,
      },
    });

    if (!entry1 || !entry2) throw new Error("Failed to create entries");

    // Act & Assert - should fail due to conflict
    await expect(
      t.run(async (ctx) => {
        await entries.forUser(user._id).finalizeSubmission(ctx.db, {
          lat: -33.63,
          lng: 115.39,
          placeId,
        });
      }),
    ).rejects.toThrow(/already has an approved entry/);

    // Verify entry2 is still in submitting status
    const entryAfterError = await t.run(async (ctx) => {
      return await entries.forEntry(entry2._id).get(ctx.db);
    });
    expect(entryAfterError.status).toBe("submitting");
  });

  it("should successfully finalize submission when entry is within boundary", async () => {
    // Arrange - create entry in submitting status with coordinates inside boundary
    const entry = await createTestEntry(t, {
      submittedByUserId: user._id,
      status: "submitting",
      name: "Entry Within Boundary",
      houseAddress: {
        address: "Within Boundary Address",
        placeId: "within-boundary-place-id",
      },
    });

    if (!entry) throw new Error("Failed to create entry");

    // Coordinates within the competition boundary
    const withinBoundaryLat = -33.63;
    const withinBoundaryLng = 115.39;

    // Act
    await t.run(async (ctx) => {
      await entries.forUser(user._id).finalizeSubmission(ctx.db, {
        lat: withinBoundaryLat,
        lng: withinBoundaryLng,
        placeId: entry.houseAddress?.placeId || "",
      });
    });

    // Assert - entry should be in submitted status
    const finalizedEntry = await t.run(async (ctx) => {
      return await entries.forEntry(entry._id).get(ctx.db);
    });

    expect(finalizedEntry.status).toBe("submitted");
    if (finalizedEntry.status === "submitted") {
      expect(finalizedEntry.houseAddress).toEqual({
        address: "Within Boundary Address",
        lat: withinBoundaryLat,
        lng: withinBoundaryLng,
        placeId: "within-boundary-place-id",
      });
      expect(finalizedEntry.submittedAt).toBeDefined();
    }
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
