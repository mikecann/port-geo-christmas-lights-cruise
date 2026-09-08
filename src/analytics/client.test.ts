import { beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js/dist/module.no-external", () => ({ default: sdk }));
const id = "j970pq0asyav77fekdj08grwan6npmh1";
let storage: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  // A developer's enabled local preview must not change test defaults.
  vi.stubEnv("VITE_ANALYTICS_ENABLED", "false");
  vi.stubEnv("VITE_ANALYTICS_GEOIP_ENABLED", "false");
  vi.stubEnv("VITE_IS_TEST_MODE", "false");
  storage = new Map();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("navigator", { doNotTrack: "0" });
  vi.stubGlobal("location", {
    href: `https://example.com/entries/${id}?utm_source=qr&utm_medium=qr`,
  });
  vi.stubGlobal("document", { referrer: "" });
});
async function enabled() {
  vi.stubEnv("VITE_ANALYTICS_ENABLED", "true");
  vi.stubEnv("VITE_POSTHOG_KEY", "phc_test");
  vi.stubEnv("VITE_POSTHOG_HOST", "https://us.i.posthog.com");
  const client = await import("./client");
  await client.initAnalytics();
  return client;
}
describe("analytics lifecycle", () => {
  it("does not initialize or capture without explicit enablement", async () => {
    const client = await import("./client");
    await client.initAnalytics();
    client.track("page_viewed");
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
    expect(storage.size).toBe(0);
  });
  it("respects DNT and test mode", async () => {
    vi.stubGlobal("navigator", { doNotTrack: "1" });
    await enabled();
    expect(sdk.init).not.toHaveBeenCalled();
    vi.stubGlobal("navigator", { doNotTrack: "0" });
    vi.stubEnv("VITE_IS_TEST_MODE", "true");
    await enabled();
    expect(sdk.init).not.toHaveBeenCalled();
  });
  it("keeps attribution and anonymous identity through OAuth reload without duplicate visits", async () => {
    await enabled();
    const first = sdk.init.mock.calls[0][1].bootstrap.distinctID;
    vi.resetModules();
    vi.stubGlobal("location", { href: "https://example.com/?code=secret" });
    vi.stubGlobal("document", { referrer: "https://accounts.google.com" });
    const client = await enabled();
    client.track("vote_succeeded", { entry_id: id });
    expect(sdk.init.mock.calls[1][1].bootstrap.distinctID).toBe(first);
    expect(
      sdk.capture.mock.calls.filter(([event]) => event === "visit_started"),
    ).toHaveLength(1);
    expect(sdk.capture).toHaveBeenLastCalledWith(
      "vote_succeeded",
      expect.objectContaining({ channel: "qr", referral_entry_id: id }),
    );
  });
  it("counts success only after resolution, and propagates failure without sending error text", async () => {
    const client = await enabled();
    sdk.capture.mockClear();
    let resolve!: (value: null) => void;
    const promise = client.measured(
      () =>
        new Promise<null>((r) => {
          resolve = r;
        }),
      "vote",
      { entry_id: id },
    );
    expect(sdk.capture.mock.calls.map(([event]) => event)).toEqual([
      "vote_submitted",
    ]);
    resolve(null);
    await promise;
    expect(sdk.capture.mock.calls.map(([event]) => event)).toEqual([
      "vote_submitted",
      "vote_succeeded",
    ]);
    sdk.capture.mockClear();
    await expect(
      client.measured(
        () => Promise.reject(new Error("private address")),
        "vote",
      ),
    ).rejects.toThrow("private address");
    expect(sdk.capture.mock.calls.map(([event]) => event)).toEqual([
      "vote_submitted",
      "vote_failed",
    ]);
    expect(JSON.stringify(sdk.capture.mock.calls)).not.toContain(
      "private address",
    );
  });
  it("fails closed on blocked storage", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    await enabled();
    expect(sdk.init).not.toHaveBeenCalled();
  });
  it("disables automatic collection and enforces the final payload boundary", async () => {
    await enabled();
    const config = sdk.init.mock.calls[0][1];
    expect(config).toMatchObject({
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      person_profiles: "never",
      advanced_disable_flags: true,
      persistence: "memory",
    });
    expect(
      config.before_send({ event: "$snapshot", properties: {} }),
    ).toBeNull();
    const event = config.before_send({
      event: "vote_succeeded",
      $set: { email: "private" },
      $set_once: { $initial_current_url: "private" },
      properties: {
        entry_id: id,
        $current_url: "private",
        $set: { email: "private" },
        token: "untrusted-project",
      },
    });
    expect(event.properties).toEqual({
      entry_id: id,
      $geoip_disable: true,
      $process_person_profile: false,
      token: "phc_test",
      environment: "test",
    });
    expect(event).not.toHaveProperty("$set");
    expect(event).not.toHaveProperty("$set_once");
  });
  it("does not let SDK capture failure change a successful vote result", async () => {
    const client = await enabled();
    sdk.capture.mockImplementation(() => {
      throw new Error("SDK unavailable");
    });
    await expect(
      client.measured(() => Promise.resolve(null), "vote"),
    ).resolves.toBeNull();
    sdk.capture.mockReset();
  });
  it("forwards explicit GeoIP configuration to the final privacy boundary", async () => {
    vi.stubEnv("VITE_ANALYTICS_GEOIP_ENABLED", "true");
    await enabled();
    const config = sdk.init.mock.calls[0][1];
    expect(
      config.before_send({
        event: "visit_started",
        properties: { $ip: "203.0.113.1", latitude: 12 },
      }).properties,
    ).toEqual({
      $geoip_disable: false,
      $process_person_profile: false,
      token: "phc_test",
      environment: "test",
    });
  });
  it("records an auth return once, without claiming account creation", async () => {
    const client = await enabled();
    client.authStarted();
    client.authCompleted();
    client.authCompleted();
    expect(
      sdk.capture.mock.calls.filter(([event]) => event === "auth_succeeded"),
    ).toHaveLength(1);
  });
  it("labels only the public site as production and ignores caller labels", async () => {
    await enabled();
    const send = sdk.init.mock.calls[0][1].before_send;
    const event = {
      event: "visit_started",
      properties: { environment: "production" },
    };
    expect(send(event).properties.environment).toBe("test");
    vi.stubGlobal("location", { hostname: "portgeochristmascruise.com.au" });
    expect(send(event).properties.environment).toBe("production");
    vi.stubGlobal("location", {
      hostname: "portgeochristmascruise.com.au.example.com",
    });
    expect(send(event).properties.environment).toBe("test");
  });
});
