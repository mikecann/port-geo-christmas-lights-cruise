import type { PostHog } from "posthog-js/dist/module.no-external";
import {
  attribution,
  sanitize,
  type EventName,
  type Properties,
} from "./privacy";

let posthog: PostHog | undefined;
let pending: Array<[EventName, Properties]> = [];
let enabled = false;
let visit: Record<string, unknown> = {};
const storageKey = "pg-analytics-v1";

export async function initAnalytics() {
  if (enabled) return;
  const env = import.meta.env;
  if (
    env.VITE_ANALYTICS_ENABLED !== "true" ||
    env.VITE_IS_TEST_MODE === "true" ||
    !env.VITE_POSTHOG_KEY ||
    !["https://us.i.posthog.com", "https://eu.i.posthog.com"].includes(
      env.VITE_POSTHOG_HOST,
    ) ||
    navigator.doNotTrack === "1"
  )
    return;
  try {
    const now = Date.now();
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    const fresh =
      !saved ||
      typeof saved.expires !== "number" ||
      saved.expires < now ||
      !/^[a-f0-9-]{36}$/.test(saved.id);
    const state = fresh
      ? {
          id: crypto.randomUUID(),
          expires: now + 30 * 60_000,
          attribution: attribution(location.href, document.referrer),
        }
      : saved;
    visit = sanitize("visit_started", state.attribution) ?? {};
    sessionStorage.setItem(storageKey, JSON.stringify(state));
    enabled = true;
    if (fresh) track("visit_started");
    // Keep the SDK out of the initial bundle and never load it when disabled.
    const sdk = (await import("posthog-js/dist/module.no-external")).default;
    sdk.init(env.VITE_POSTHOG_KEY, {
      api_host: env.VITE_POSTHOG_HOST,
      bootstrap: { distinctID: state.id },
      persistence: "memory",
      person_profiles: "never",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_heatmaps: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_flags: true,
      advanced_disable_decide: true,
      disable_external_dependency_loading: true,
      save_referrer: false,
      save_campaign_params: false,
      respect_dnt: true,
      before_send: (event) => {
        if (!event) return null;
        const properties = sanitize(
          event.event,
          event.properties,
          env.VITE_ANALYTICS_GEOIP_ENABLED === "true",
        );
        // Ingestion authenticates with this public project token inside each
        // event. Restore it from configuration, never from caller properties.
        return properties
          ? {
              event: event.event,
              uuid: event.uuid,
              timestamp: event.timestamp,
              properties: {
                ...properties,
                token: env.VITE_POSTHOG_KEY,
                // Preview and local smoke tests must not inflate public reports.
                environment: [
                  "portgeochristmascruise.com.au",
                  "www.portgeochristmascruise.com.au",
                ].includes(location.hostname)
                  ? "production"
                  : "test",
              },
            }
          : null;
      },
    });
    posthog = sdk;
    for (const [event, properties] of pending) track(event, properties);
    pending = [];
  } catch {
    enabled = false;
    pending = [];
    /* Analytics and blocked storage must never prevent app startup. */
  }
}

export function track(event: EventName, properties: Properties = {}) {
  if (!enabled) return;
  if (!posthog) {
    if (pending.length < 100) pending.push([event, properties]);
    return;
  }
  try {
    posthog.capture(event, { ...visit, ...properties });
  } catch {
    /* Best effort only. */
  }
}

export function authStarted() {
  track("auth_started");
  if (!enabled) return;
  try {
    sessionStorage.setItem("pg-auth-start", String(Date.now()));
  } catch {
    /* Storage unavailable. */
  }
}

export function authCompleted() {
  if (!enabled) return;
  try {
    const started = Number(sessionStorage.getItem("pg-auth-start"));
    sessionStorage.removeItem("pg-auth-start");
    if (started && Date.now() - started < 30 * 60_000) track("auth_succeeded");
  } catch {
    /* Storage unavailable. */
  }
}

// Observe the real promise, not optimistic state or a click. Preserve rejection
// for the caller's existing error UI and never send error text.
export async function measured<T>(
  operation: () => Promise<T>,
  event: "vote" | "entry_signup" | "entry_submit",
  properties: Properties = {},
) {
  track(event === "vote" ? "vote_submitted" : `${event}_started`, properties);
  try {
    const result = await operation();
    track(`${event}_succeeded`, properties);
    return result;
  } catch (error) {
    track(`${event}_failed`, properties);
    throw error;
  }
}
