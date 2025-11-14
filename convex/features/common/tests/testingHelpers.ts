import { convexTest } from "convex-test";
import schema from "../../../schema";
import type { Doc, Id } from "../../../_generated/dataModel";
import { ensure } from "../../../../shared/ensure";
import { getAuthUserId } from "@convex-dev/auth/server";
import { entries } from "../../entries/model";

export const createConvexTest = () => {
  const t = convexTest(schema);

  return t;
};
export type ConvexTest = ReturnType<typeof createConvexTest>;
export type AuthenticatedConvexTest = ReturnType<typeof signInAsTestUser>;
export type TestOrAuthenticatedConvexTest =
  | ConvexTest
  | AuthenticatedConvexTest;

export const createTestUser = async (
  t: ConvexTest,
  options: {
    user?: Partial<Doc<"users">>;
  } = {},
): Promise<Doc<"users">> => {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      ...options.user,
    });
    const user = await ctx.db.get(userId);
    return ensure(user);
  });
};

export const signInAsTestUser = (t: ConvexTest, user: Doc<"users">) => {
  return t.withIdentity({
    subject: user._id,
    tokenIdentifier: `test|${user._id}`,
  });
};

export const createConvexTestWithUser = async (
  user?: Doc<"users">,
): Promise<{
  t: AuthenticatedConvexTest;
  user: Doc<"users">;
}> => {
  const t = createConvexTest();

  const u = user ?? (await createTestUser(t));
  const asUser = signInAsTestUser(t, u);
  return { t: asUser, user: u };
};

export const getAllTestEntries = (t: TestOrAuthenticatedConvexTest) => {
  return t.run(async (ctx) => {
    const entries = await ctx.db.query("entries").collect();
    return entries;
  });
};

export const getTheOnlyTestEntry = async (t: TestOrAuthenticatedConvexTest) => {
  const entries = await getAllTestEntries(t);
  if (entries.length != 1) throw new Error("Expected 1 entry");
  return ensure(entries[0]);
};

export const createTestStorageId = async (
  t: TestOrAuthenticatedConvexTest,
): Promise<Id<"_storage">> => {
  // Store a test blob in Convex storage
  return t.run(async (ctx) => {
    const blob = new Blob(["test image data"], { type: "image/jpeg" });
    const storageId = await ctx.storage.store(blob);
    return storageId;
  });
};

export const createTestPhotoObject = async (
  t: TestOrAuthenticatedConvexTest,
  storageId?: Id<"_storage">,
): Promise<{ storageId: Id<"_storage"> }> => {
  // Create a mock photo object for testing
  const id = storageId || (await createTestStorageId(t));
  return {
    storageId: id,
  };
};

export const moveEntryToStatus = async (
  t: TestOrAuthenticatedConvexTest,
  options: {
    entryId: Id<"entries">;
    status: "draft" | "submitted" | "approved";
    overrides?: Record<string, unknown>;
  },
) => {
  /**
   * Helper function to move entries between different statuses with sensible defaults.
   *
   * Examples:
   * - moveEntryToStatus(t, { entryId, status: "submitted" })
   * - moveEntryToStatus(t, { entryId, status: "submitted", overrides: { houseAddress: "456 Oak St" } })
   * - moveEntryToStatus(t, { entryId, status: "approved", overrides: { name: "Custom Entry Name" } })
   */
  const { entryId, status, overrides = {} } = options;

  return t.run(async (ctx) => {
    // Get the current entry to preserve some fields
    const currentEntry = await entries.query(ctx).forEntry(entryId).get();
    if (!currentEntry)
      throw new Error(`Entry '${entryId}' not found in moveEntryToStatus`);

    const baseDefaults = {
      houseAddress: {
        address: "123 Main St",
        lat: 0,
        lng: 0,
        placeId: "pid-test",
      },
      name: "Test Entry",
    };

    let newEntry: Record<string, unknown>;

    if (status === "draft")
      newEntry = {
        status: "draft" as const,
        submittedByUserId: currentEntry.submittedByUserId,
        houseAddress: {
          address:
            typeof currentEntry.houseAddress === "string"
              ? currentEntry.houseAddress
              : currentEntry.houseAddress?.address || "123 Main St",
          placeId: "pid-test",
        },
        name: currentEntry.name,
        ...overrides,
      };
    else if (status === "submitted") {
      const { houseAddress: overrideHouseAddress, ...restOverrides } =
        overrides;
      const mergedHouseAddress = {
        ...baseDefaults.houseAddress,
        ...(overrideHouseAddress || {}),
      };
      newEntry = {
        status: "submitted" as const,
        submittedAt: Date.now(),
        submittedByUserId: currentEntry.submittedByUserId,
        houseAddress: mergedHouseAddress,
        name: (restOverrides.name as string) || baseDefaults.name,
        ...restOverrides,
      };
    } else if (status === "approved") {
      const submittedAt =
        currentEntry.status === "submitted" ||
        currentEntry.status === "approved"
          ? currentEntry.submittedAt
          : Date.now() - 1000; // Default to 1 second ago if not set

      // Get the next available entry number
      const entryNumber = await entries.mutate(ctx).getNextAvailableEntryNumber();

      const { houseAddress: overrideHouseAddress, ...restOverrides } =
        overrides;
      const mergedHouseAddress = {
        ...baseDefaults.houseAddress,
        ...(overrideHouseAddress || {}),
      };
      newEntry = {
        status: "approved" as const,
        submittedAt,
        approvedAt: Date.now(),
        entryNumber,
        submittedByUserId: currentEntry.submittedByUserId,
        houseAddress: mergedHouseAddress,
        name: (restOverrides.name as string) || baseDefaults.name,
        ...restOverrides,
      };
    } else throw new Error(`Unknown status: ${status}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await ctx.db.replace(entryId, newEntry as any);
  });
};

export const createTestEntry = async (
  t: TestOrAuthenticatedConvexTest,
  overrides: Partial<Doc<"entries">> = {},
) => {
  const user = await getTestUser(t);
  return t.run(async (ctx) => {
    // Create a basic draft entry first
    const entryId = await ctx.db.insert("entries", {
      status: "draft",
      submittedByUserId: user._id,
    });

    // Apply any overrides if provided (excluding system fields)
    if (Object.keys(overrides).length > 0) {
      const { _id, _creationTime, ...patchData } = overrides;
      if (Object.keys(patchData).length > 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.db.patch(entryId, patchData as any);
    }

    return await entries.query(ctx).forEntry(entryId).get();
  });
};

export const getTestUser = (t: TestOrAuthenticatedConvexTest) => {
  return t.run(async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error(`Couldnt find user with id ${userId}`);
    const user = await ctx.db.get(userId);
    return ensure(user);
  });
};
