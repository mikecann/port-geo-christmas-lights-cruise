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
