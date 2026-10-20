import { describe, it, expect, beforeEach } from "vitest";
import type {
  ConvexTest,
  AuthenticatedConvexTest,
} from "../common/tests/testingHelpers.vitest";
import {
  createConvexTest,
  createTestUser,
  createTestEntry,
  moveEntryToStatus,
  signInAsTestUser,
} from "../common/tests/testingHelpers.vitest";
import { entries } from "./model";
import type { Doc } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import { competitions } from "../competitions/model";

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
      state: {
        kind: "submitting",
        name: "Test Entry",
        houseAddress: {
          address: "123 Test Street",
          placeId: "test-place-id-123",
        },
      },
    });

    if (!entry || entry.state.kind !== "submitting")
      throw new Error("Failed to create entry in submitting status");

    // Act
    await t.mutation(internal.internal.entries.revertToDraft, {
      userId: user._id,
    });

    // Assert
    const revertedEntry = await t.run(async (ctx) => {
      return await entries.query(ctx).forEntry(entry._id).get();
    });

    expect(revertedEntry.state.kind).toBe("draft");
    expect(revertedEntry.state.name).toBe("Test Entry");
    expect(revertedEntry.state.houseAddress).toEqual({
      address: "123 Test Street",
      placeId: "test-place-id-123",
    });
  });

  it("should preserve address data when reverting from submitting to draft", async () => {
    // Arrange
    const entry = await createTestEntry(t, {
      submittedByUserId: user._id,
      state: {
        kind: "submitting",
        name: "Entry with Address",
        houseAddress: {
          address: "456 Oak Avenue",
          placeId: "place-456",
        },
      },
    });

    if (!entry) throw new Error("Failed to create entry");

    // Act
    await t.mutation(internal.internal.entries.revertToDraft, {
      userId: user._id,
    });

    // Assert
    const revertedEntry = await t.run(async (ctx) => {
      return await entries.query(ctx).forEntry(entry._id).get();
    });

    expect(revertedEntry.state.kind).toBe("draft");
    expect(revertedEntry.state.houseAddress?.address).toBe("456 Oak Avenue");
    expect(revertedEntry.state.houseAddress?.placeId).toBe("place-456");
  });

  it("leaves an entry that's already a draft alone: its timer sent it back first", async () => {
    const entry = await createTestEntry(t, {
      submittedByUserId: user._id,
      state: { kind: "draft" },
    });
    if (!entry) throw new Error("Failed to create entry");

    await expect(
      t.mutation(internal.internal.entries.revertToDraft, {
        userId: user._id,
      }),
    ).resolves.toBeNull();
    const after = await t.run((ctx) => ctx.db.get("entries", entry._id));
    expect(after?.state.kind).toBe("draft");
  });

  it("should throw an error when trying to revert an entry that is past submitting", async () => {
    const entry = await createTestEntry(t, {
      submittedByUserId: user._id,
      state: {
        kind: "submitted",
        submittedAt: Date.now(),
        name: "Test",
        houseAddress: { address: "1 Test St", lat: 0, lng: 0, placeId: "p1" },
      },
    });
    if (!entry) throw new Error("Failed to create entry");

    await expect(
      t.mutation(internal.internal.entries.revertToDraft, {
        userId: user._id,
      }),
    ).rejects.toThrow(/not in submitting status, cannot revert/);
  });

  it("should handle entries without address data when reverting", async () => {
    // Arrange - create an entry in submitting status without houseAddress
    const entryId = await t.run(async (ctx) => {
      const competition = await competitions.query(ctx).current();
      const id = await ctx.db.insert("entries", {
        competitionId: competition._id,
        submittedByUserId: user._id,
        state: {
          kind: "submitting",
          name: "Entry Without Address",
          houseAddress: {
            address: "Test Address",
            placeId: "test-place",
          },
        },
        stateTimers: [],
      });
      return id;
    });

    // Act
    await t.mutation(internal.internal.entries.revertToDraft, {
      userId: user._id,
    });

    // Assert
    const revertedEntry = await t.run(async (ctx) => {
      return await entries.query(ctx).forEntry(entryId).get();
    });

    expect(revertedEntry.state.kind).toBe("draft");
  });
});

describe("submission error reversion", () => {
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

  it("should revert entry to draft when finalizeSubmission fails due to boundary violation", async () => {
    // Arrange - create an entry in submitting status with coordinates outside boundary
    const entry = await createTestEntry(t, {
      submittedByUserId: user1._id,
      state: {
        kind: "submitting",
        name: "Entry Outside Boundary",
        houseAddress: {
          address: "24 Hardy Street, Augusta WA, Australia",
          placeId: "augusta-place-id",
        },
      },
    });

    if (!entry) throw new Error("Failed to create entry");

    // Coordinates outside the competition boundary (Augusta is way north)
    const outsideBoundaryLat = -33.7; // Outside the boundary
    const outsideBoundaryLng = 115.35;

    // Act & Assert - finalizeSubmission should fail
    await expect(
      t.mutation(internal.internal.entries.finalizeSubmission, {
        entryId: entry._id,
        lat: outsideBoundaryLat,
        lng: outsideBoundaryLng,
        placeId: entry.state.houseAddress?.placeId ?? "",
      }),
    ).rejects.toThrow(/outside the competition area/);

    // Verify entry is still in submitting status (needs manual revert)
    const entryAfterError = await t.run(async (ctx) => {
      return await entries.query(ctx).forEntry(entry._id).get();
    });
    expect(entryAfterError.state.kind).toBe("submitting");
  });

  it("should revert entry to draft when finalizeSubmission fails due to address conflict", async () => {
    // Arrange - create two entries with the same placeId (different users)
    const placeId = "conflicting-place-id";
    const entry1 = await createTestEntry(t, {
      submittedByUserId: user1._id,
    });
    if (!entry1) throw new Error("Failed to create entry1");

    // Move entry1 to submitted status using the helper
    await moveEntryToStatus(t, {
      entryId: entry1._id,
      status: "submitted",
      overrides: {
        houseAddress: {
          address: "123 Test St",
          lat: -33.63,
          lng: 115.39,
          placeId,
        },
        name: "First Entry",
      },
    });

    // Use user2 for entry2 to avoid unique() query issues
    const t2 = signInAsTestUser(rawTest, user2);
    const entry2 = await createTestEntry(t2, {
      submittedByUserId: user2._id,
      state: {
        kind: "submitting",
        name: "Second Entry",
        houseAddress: {
          address: "123 Test St",
          placeId,
        },
      },
    });

    if (!entry2) throw new Error("Failed to create entry2");

    // Act & Assert - should fail due to conflict
    await expect(
      t2.mutation(internal.internal.entries.finalizeSubmission, {
        entryId: entry2._id,
        lat: -33.63,
        lng: 115.39,
        placeId,
      }),
    ).rejects.toThrow(/is already used!/);

    // Verify entry2 is still in submitting status
    const entryAfterError = await t2.run(async (ctx) => {
      return await entries.query(ctx).forEntry(entry2._id).get();
    });
    expect(entryAfterError.state.kind).toBe("submitting");
  });

  it("should successfully finalize submission when entry is within boundary", async () => {
    // Arrange - create entry in submitting status with coordinates inside boundary
    const entry = await createTestEntry(t, {
      submittedByUserId: user1._id,
      state: {
        kind: "submitting",
        name: "Entry Within Boundary",
        houseAddress: {
          address: "Within Boundary Address",
          placeId: "within-boundary-place-id",
        },
      },
    });

    if (!entry) throw new Error("Failed to create entry");

    // Coordinates within the competition boundary
    const withinBoundaryLat = -33.63;
    const withinBoundaryLng = 115.39;

    // Act
    await t.mutation(internal.internal.entries.finalizeSubmission, {
      entryId: entry._id,
      lat: withinBoundaryLat,
      lng: withinBoundaryLng,
      placeId: entry.state.houseAddress?.placeId ?? "",
    });

    // Assert - entry should be in submitted status
    const finalizedEntry = await t.run(async (ctx) => {
      return await entries.query(ctx).forEntry(entry._id).get();
    });

    expect(finalizedEntry.state.kind).toBe("submitted");
    if (finalizedEntry.state.kind === "submitted") {
      expect(finalizedEntry.state.houseAddress).toEqual({
        address: "Within Boundary Address",
        lat: withinBoundaryLat,
        lng: withinBoundaryLng,
        placeId: "within-boundary-place-id",
      });
      expect(finalizedEntry.state.submittedAt).toBeDefined();
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
          lat: -33.63,
          lng: 115.39,
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
        state: {
          kind: "submitting",
          name: "Second Entry",
          houseAddress: {
            address: "123 Test St",
            placeId: sharedPlaceId,
          },
        },
      });
    });

    // Try to finalize entry2 - should throw an error
    await expect(
      t.mutation(internal.internal.entries.finalizeSubmission, {
        entryId: entry2._id,
        lat: -33.63,
        lng: 115.39,
        placeId: sharedPlaceId,
      }),
    ).rejects.toThrow(/is already used!/);
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
        state: {
          kind: "submitting",
          name: "Test Entry",
          houseAddress: {
            address: "456 Oak St",
            placeId: uniquePlaceId,
          },
        },
      });
    });

    // Finalize should succeed - use coordinates within the competition boundary
    await t.mutation(internal.internal.entries.finalizeSubmission, {
      entryId: entry._id,
      lat: -33.63,
      lng: 115.39,
      placeId: uniquePlaceId,
    });

    // Verify the entry was finalized successfully
    const finalizedEntry = await t.run(async (ctx) => {
      return await entries.query(ctx).forEntry(entry._id).get();
    });

    expect(finalizedEntry.state.kind).toBe("submitted");
    if (finalizedEntry.state.kind === "submitted")
      expect(finalizedEntry.state.houseAddress.placeId).toBe(uniquePlaceId);
  });

  it("should allow finalization if other entries with same placeId are only draft or rejected", async () => {
    const sharedPlaceId = "shared-place-789";

    // Create separate users for each entry to avoid conflicts
    const user3 = await createTestUser(rawTest, {});
    const user4 = await createTestUser(rawTest, {});

    // Create a draft entry with the shared placeId
    await createTestEntry(t, {
      submittedByUserId: user3._id,
      state: {
        kind: "draft",
        houseAddress: {
          address: "789 Pine St",
          placeId: sharedPlaceId,
        },
      },
    });

    // Create a rejected entry with the shared placeId
    const rejectedEntry = await createTestEntry(t, {
      submittedByUserId: user4._id,
    });
    if (!rejectedEntry) throw new Error("Failed to create rejectedEntry");
    // Manually create rejected entry since moveEntryToStatus doesn't support rejected
    await t.run(async (ctx) => {
      await ctx.db.replace(rejectedEntry._id, {
        competitionId: rejectedEntry.competitionId,
        submittedByUserId: user4._id,
        state: {
          kind: "rejected",
          name: "Rejected Entry",
          submittedAt: Date.now() - 1000,
          rejectedAt: Date.now(),
          rejectedReason: "Test rejection reason",
          houseAddress: {
            address: "789 Pine St",
            lat: -33.63,
            lng: 115.39,
            placeId: sharedPlaceId,
          },
        },
        stateTimers: [],
      });
    });

    // Create a new entry to finalize with a different user
    const entryToFinalize = await createTestEntry(t, {
      submittedByUserId: user1._id,
    });
    if (!entryToFinalize) throw new Error("Failed to create entryToFinalize");

    await t.run(async (ctx) => {
      await ctx.db.patch(entryToFinalize._id, {
        state: {
          kind: "submitting",
          name: "Entry To Finalize",
          houseAddress: {
            address: "789 Pine St",
            placeId: sharedPlaceId,
          },
        },
      });
    });

    // Finalize should succeed since only draft and rejected entries exist with this placeId
    // Use coordinates within the competition boundary
    await t.mutation(internal.internal.entries.finalizeSubmission, {
      entryId: entryToFinalize._id,
      lat: -33.63,
      lng: 115.39,
      placeId: sharedPlaceId,
    });

    // Verify the entry was finalized successfully
    const finalizedEntry = await t.run(async (ctx) => {
      return await entries.query(ctx).forEntry(entryToFinalize._id).get();
    });

    expect(finalizedEntry.state.kind).toBe("submitted");
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
        state: {
          kind: "submitting",
          name: "First Submitting Entry",
          houseAddress: {
            address: "456 Oak St",
            placeId: sharedPlaceId,
          },
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
        state: {
          kind: "submitting",
          name: "Second Entry",
          houseAddress: {
            address: "456 Oak St",
            placeId: sharedPlaceId,
          },
        },
      });
    });

    // Try to finalize entry2 - should throw an error because entry1 is already submitting
    await expect(
      t.mutation(internal.internal.entries.finalizeSubmission, {
        entryId: entry2._id,
        lat: 10,
        lng: 20,
        placeId: sharedPlaceId,
      }),
    ).rejects.toThrow(/is already used!/);
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
        state: {
          kind: "submitting",
          name: "Second Entry",
          houseAddress: {
            address: "789 Elm St",
            placeId: sharedPlaceId,
          },
        },
      });
    });

    // Try to finalize entry2 - should throw an error because entry1 is already submitted
    await expect(
      t.mutation(internal.internal.entries.finalizeSubmission, {
        entryId: entry2._id,
        lat: 15,
        lng: 25,
        placeId: sharedPlaceId,
      }),
    ).rejects.toThrow(/is already used!/);
  });
});
