import { describe, expect, it, vi } from "vitest";
import { recoverFromFailedPageLoad, type ReloadDeps } from "./staleBuild";

function fakeDeps(overrides: Partial<ReloadDeps> = {}) {
  const store = new Map<string, string>();
  const deps: ReloadDeps = {
    storage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => void store.set(key, value),
    },
    reload: vi.fn(),
    now: () => 1_000_000,
    online: true,
    ...overrides,
  };
  return deps;
}

const failed = new TypeError(
  "Failed to fetch dynamically imported module: https://example.com/assets/TicketsPage-CRh-KKS2.js",
);

// Resolves to "pending" if the promise hasn't settled after a tick
async function settled(promise: Promise<unknown>) {
  return Promise.race([
    promise.then(
      () => "resolved",
      (error: unknown) => error,
    ),
    new Promise((resolve) => setTimeout(() => resolve("pending"), 0)),
  ]);
}

describe("recoverFromFailedPageLoad", () => {
  it("reloads to pick up the new build, and never settles so the page keeps loading", async () => {
    const deps = fakeDeps();

    const result = recoverFromFailedPageLoad(failed, deps);

    expect(deps.reload).toHaveBeenCalledTimes(1);
    expect(await settled(result)).toBe("pending");
  });

  it("gives up and rethrows if it already reloaded in the last minute", async () => {
    let now = 1_000_000;
    const deps = fakeDeps({ now: () => now });
    void recoverFromFailedPageLoad(failed, deps);

    now += 5_000;
    const second = recoverFromFailedPageLoad(failed, deps);

    expect(deps.reload).toHaveBeenCalledTimes(1);
    expect(await settled(second)).toBe(failed);
  });

  it("reloads again for a later deploy in the same tab", async () => {
    let now = 1_000_000;
    const deps = fakeDeps({ now: () => now });
    void recoverFromFailedPageLoad(failed, deps);

    now += 10 * 60_000;
    const later = recoverFromFailedPageLoad(failed, deps);

    expect(deps.reload).toHaveBeenCalledTimes(2);
    expect(await settled(later)).toBe("pending");
  });

  it("doesn't reload when offline, since that would only show the browser's offline page", async () => {
    const deps = fakeDeps({ online: false });

    expect(await settled(recoverFromFailedPageLoad(failed, deps))).toBe(failed);
    expect(deps.reload).not.toHaveBeenCalled();
  });

  it("doesn't reload without session storage, as nothing would stop a reload loop", async () => {
    const deps = fakeDeps({ storage: undefined });

    expect(await settled(recoverFromFailedPageLoad(failed, deps))).toBe(failed);
    expect(deps.reload).not.toHaveBeenCalled();
  });

  it("doesn't reload when session storage throws", async () => {
    const deps = fakeDeps({
      storage: {
        getItem: () => {
          throw new Error("SecurityError");
        },
        setItem: () => {},
      },
    });

    expect(await settled(recoverFromFailedPageLoad(failed, deps))).toBe(failed);
    expect(deps.reload).not.toHaveBeenCalled();
  });
});
