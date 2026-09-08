export const sources = [
  "facebook",
  "twitter",
  "whatsapp",
  "linkedin",
  "email",
  "copy",
  "native",
  "qr",
] as const;
export type ShareSource = (typeof sources)[number];
export const events = [
  "visit_started",
  "page_viewed",
  "entry_viewed",
  "share_intent",
  "native_share_resolved",
  "vote_opened",
  "vote_auth_required",
  "vote_submitted",
  "vote_succeeded",
  "vote_failed",
  "vote_cancelled",
  "auth_started",
  "auth_succeeded",
  "auth_failed",
  "entry_signup_started",
  "entry_signup_succeeded",
  "entry_signup_failed",
  "entry_submit_started",
  "entry_submit_succeeded",
  "entry_submit_failed",
  "ticket_link_clicked",
] as const;
export type EventName = (typeof events)[number];
export type Properties = {
  entry_id?: string;
  competition_id?: string;
  category?: "best_display" | "most_jolly";
  source?: ShareSource;
  surface?: "entry" | "map";
  is_entrant?: boolean;
  page?: string;
};

export function shareLink(
  origin: string,
  entryId: string,
  source: ShareSource,
) {
  const url = new URL(`/entries/${encodeURIComponent(entryId)}`, origin);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", source === "qr" ? "qr" : "entry_share");
  return url.href;
}

export function attribution(href: string, referrer: string) {
  const url = new URL(href);
  const source = url.searchParams.get("utm_source");
  const medium = url.searchParams.get("utm_medium");
  const tagged =
    sources.includes(source as ShareSource) &&
    (medium === "entry_share" || medium === "qr");
  const entry = url.pathname.match(
    /^\/entries\/([a-z0-9]{20,40})(?:\/vote)?$/,
  )?.[1];
  let channel = "direct_unknown";
  if (tagged)
    channel =
      source === "qr"
        ? "qr"
        : source === "email"
          ? "email"
          : ["copy", "native"].includes(source ?? "")
            ? "shared_link"
            : "social";
  else if (referrer)
    try {
      const host = new URL(referrer).hostname;
      if (host !== url.hostname)
        channel =
          /(^|\.)(facebook\.com|instagram\.com|t\.co|twitter\.com|x\.com|linkedin\.com)$/.test(
            host,
          )
            ? "social"
            : "referral";
    } catch {
      /* Malformed referrers are unknown, never sent verbatim. */
    }

  return {
    channel,
    ...(tagged
      ? { source, ...(entry ? { referral_entry_id: entry } : {}) }
      : {}),
  };
}

// Rebuild the payload from a small allowlist. SDK URL, title, referrer, form,
// person and client-supplied location properties never cross this boundary.
// GeoIP enrichment happens later on PostHog servers and needs its own filtering.
export function sanitize(
  event: string,
  properties: Record<string, unknown>,
  allowGeoip = false,
) {
  if (!events.includes(event as EventName)) return null;
  const safe: Record<string, unknown> = {
    $geoip_disable: !allowGeoip,
    $process_person_profile: false,
  };
  for (const [key, value] of Object.entries(properties)) {
    if (
      ["distinct_id", "$session_id", "$window_id", "$device_id"].includes(
        key,
      ) &&
      typeof value === "string" &&
      /^[a-zA-Z0-9-]{20,64}$/.test(value)
    )
      safe[key] = value;
    if (
      ["entry_id", "competition_id", "referral_entry_id"].includes(key) &&
      typeof value === "string" &&
      /^[a-z0-9]{20,40}$/.test(value)
    )
      safe[key] = value;
    if (key === "source" && sources.includes(value as ShareSource))
      safe[key] = value;
    if (
      key === "channel" &&
      [
        "qr",
        "email",
        "shared_link",
        "social",
        "referral",
        "direct_unknown",
      ].includes(String(value))
    )
      safe[key] = value;
    if (
      key === "page" &&
      [
        "home",
        "entries",
        "entry",
        "entryVote",
        "map",
        "mapEntry",
        "signin",
        "tickets",
        "competitionDetails",
        "myEntries",
        "myVotes",
        "settings",
      ].includes(String(value))
    )
      safe[key] = value;
    if (
      key === "category" &&
      ["best_display", "most_jolly"].includes(String(value))
    )
      safe[key] = value;
    if (key === "surface" && ["entry", "map"].includes(String(value)))
      safe[key] = value;
    if (key === "is_entrant" && typeof value === "boolean") safe[key] = value;
  }
  return safe;
}
