import { describe, expect, it } from "vitest";
import { attribution, sanitize, shareLink } from "./privacy";
const id = "j1234567890123456789012345678901";
describe("analytics privacy", () => {
  it("drops implicit SDK metadata and arbitrary personal properties", () => {
    expect(
      sanitize("vote_succeeded", {
        entry_id: id,
        category: "most_jolly",
        email: "private@example.com",
        $current_url: "https://example.com/?code=secret",
        $pathname: "/private-address",
        $initial_referrer: "secret",
        $set: { email: "secret" },
        latitude: 12,
        page: "private-address",
        source: "private@example.com",
        error: "address",
        $geoip_disable: false,
      }),
    ).toEqual({
      entry_id: id,
      category: "most_jolly",
      $geoip_disable: true,
      $process_person_profile: false,
    });
  });
  it("allows server GeoIP only explicitly while dropping supplied IPs and coordinates", () => {
    const properties = {
      $ip: "203.0.113.1",
      latitude: -33.6,
      longitude: 115.4,
      $geoip_latitude: -33.6,
      $geoip_city_name: "forged",
      $geoip_disable: false,
    };
    expect(sanitize("visit_started", properties)).toEqual({
      $geoip_disable: true,
      $process_person_profile: false,
    });
    expect(sanitize("visit_started", properties, true)).toEqual({
      $geoip_disable: false,
      $process_person_profile: false,
    });
  });
  it("rejects automatic events entirely", () => {
    for (const event of [
      "$pageview",
      "$autocapture",
      "$snapshot",
      "$identify",
      "$exception",
    ])
      expect(sanitize(event, {})).toBeNull();
  });
  it("tags every share platform without propagating the current query or hash", () => {
    const link = shareLink(
      "https://example.com/?email=secret#private",
      id,
      "facebook",
    );
    expect(link).toBe(
      `https://example.com/entries/${id}?utm_source=facebook&utm_medium=entry_share`,
    );
    expect(attribution(link, "")).toEqual({
      channel: "social",
      source: "facebook",
      referral_entry_id: id,
    });
  });
  it("separates QR, social, copied links, email, and unknown traffic", () => {
    for (const [source, channel] of [
      ["qr", "qr"],
      ["facebook", "social"],
      ["copy", "shared_link"],
      ["native", "shared_link"],
      ["email", "email"],
    ] as const)
      expect(
        attribution(shareLink("https://example.com", id, source), "").channel,
      ).toBe(channel);
    expect(attribution("https://example.com", "")).toEqual({
      channel: "direct_unknown",
    });
    expect(
      attribution(
        "https://example.com",
        "https://m.facebook.com/private?email=secret",
      ),
    ).toEqual({ channel: "social" });
  });
  it("ignores arbitrary UTM values and forged entry identifiers", () => {
    expect(
      attribution(
        "https://example.com/entries/private-address?utm_source=person@example.com&utm_medium=entry_share&utm_campaign=secret",
        "",
      ),
    ).toEqual({ channel: "direct_unknown" });
    expect(
      sanitize("entry_viewed", { entry_id: "private-address" }),
    ).not.toHaveProperty("entry_id");
  });
});
