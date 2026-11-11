import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import {
  createConvexTest,
  createTestUser,
  signInAsTestUser,
} from "../../features/common/tests/testingHelpers.vitest";
import type {
  AuthenticatedConvexTest,
  ConvexTest,
} from "../../features/common/tests/testingHelpers.vitest";

// The state machines viewer's queries: only a system admin reads anything.
// Everyone else gets null from every one of them, which the viewer shows as
// "off", rather than an error.

const everyQuery = (t: ConvexTest | AuthenticatedConvexTest) =>
  Promise.all([
    t.query(api.admin.system.viewer.overview, {}),
    t.query(api.admin.system.viewer.counts, { machine: "entry" }),
    t.query(api.admin.system.viewer.rows, { table: "entries" }),
    t.query(api.admin.system.viewer.row, { table: "entries", id: "nothing" }),
  ]);

describe("the machines viewer", () => {
  it("answers null when nobody's signed in", async () => {
    const t = createConvexTest();
    expect(await everyQuery(t)).toEqual([null, null, null, null]);
  });

  it("answers null to an entrant and to a competition admin", async () => {
    const t = createConvexTest();
    for (const user of [{}, { isCompetitionAdmin: true }]) {
      const someone = await createTestUser(t, { user });
      expect(await everyQuery(signInAsTestUser(t, someone))).toEqual([
        null,
        null,
        null,
        null,
      ]);
    }
  });

  it("answers null to a deleted system admin's session", async () => {
    const t = createConvexTest();
    const admin = await createTestUser(t, { user: { isSystemAdmin: true } });
    await t.run((ctx) => ctx.db.delete(admin._id));
    expect(await everyQuery(signInAsTestUser(t, admin))).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it("shows a system admin the machines, and nothing can send", async () => {
    const t = createConvexTest();
    const admin = await createTestUser(t, { user: { isSystemAdmin: true } });
    const asAdmin = signInAsTestUser(t, admin);
    const overview = await asAdmin.query(api.admin.system.viewer.overview, {});
    expect(overview?.send).toBe(false);
    expect(overview?.machines.map((machine) => machine.name)).toEqual([
      "entry",
    ]);
    const counts = await asAdmin.query(api.admin.system.viewer.counts, {
      machine: "entry",
    });
    expect(counts?.counts).toEqual(
      expect.objectContaining({ draft: 0, approved: 0 }),
    );
  });
});
