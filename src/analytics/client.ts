import type { PostHog } from "posthog-js/dist/module.no-external";
import {
  attribution,
  events,
  sanitize,
  type EventName,
  type Properties,
} from "./privacy";

// Events tracked before the SDK loads. The visit is merged in when they're
// queued, and the uuid lets PostHog drop a copy if one is ever sent twice.
type QueuedEvent = {
  event: EventName;
  properties: Record<string, unknown>;
  timestamp: number;
  uuid: string;
};

let posthog: PostHog | undefined;
let pending: QueuedEvent[] = [];
let enabled = false;
let visit: Record<string, unknown> = {};
let startNow: (() => void) | undefined;
const storageKey = "pg-analytics-v1";
// The queue is mirrored here so events survive the page going away, like the
// Google sign-in redirect, and are sent by the next page in this tab
const pendingKey = "pg-analytics-pending-v1";
const maxPending = 100;
const maxWaitMs = 3000;

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
  ) {
    try {
      sessionStorage.removeItem(pendingKey);
    } catch {
      /* Storage unavailable. */
    }
    return;
  }
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
    pending = readPending();
    enabled = true;
    if (fresh) track("visit_started");
    // Keep the SDK out of the initial bundle and never load it when disabled.
    // Wait until the page has loaded and gone idle, so on a slow connection it
    // doesn't compete with the app, but no more than a few seconds. Sign-in
    // starts it straight away. Events tracked until then are queued.
    await Promise.race([
      afterLoadAndIdle(),
      new Promise((resolve) => setTimeout(resolve, maxWaitMs)),
      new Promise<void>((resolve) => (startNow = resolve)),
    ]);
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
    const queued = pending;
    pending = [];
    // Clear the stored copy first so the next page can't send these again
    writePending();
    for (const queuedEvent of queued) send(queuedEvent);
  } catch {
    enabled = false;
    pending = [];
    /* Analytics and blocked storage must never prevent app startup. */
  }
}

function readPending(): QueuedEvent[] {
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(pendingKey) ?? "[]",
    );
    if (!Array.isArray(saved)) return [];
    return saved
      .filter(
        (item: QueuedEvent) =>
          events.includes(item?.event) &&
          typeof item.properties === "object" &&
          item.properties !== null &&
          typeof item.timestamp === "number" &&
          typeof item.uuid === "string",
      )
      .slice(0, maxPending);
  } catch {
    // A corrupt copy is dropped rather than turning analytics off
    return [];
  }
}

function writePending() {
  try {
    if (pending.length === 0) sessionStorage.removeItem(pendingKey);
    else sessionStorage.setItem(pendingKey, JSON.stringify(pending));
  } catch {
    /* Storage unavailable or full. The in-memory queue still works. */
  }
}

function send({ event, properties, timestamp, uuid }: QueuedEvent) {
  try {
    posthog?.capture(event, properties, {
      timestamp: new Date(timestamp),
      uuid,
    });
  } catch {
    /* Best effort only. */
  }
}

function afterLoadAndIdle() {
  return new Promise<void>((resolve) => {
    const idle = () => {
      if (typeof requestIdleCallback === "function")
        requestIdleCallback(() => resolve(), { timeout: 4000 });
      else setTimeout(resolve, 1000);
    };
    if (document.readyState === "complete") idle();
    else addEventListener("load", idle, { once: true });
  });
}

export function track(event: EventName, properties: Properties = {}) {
  if (!enabled) return;
  const queuedEvent = {
    event,
    properties: { ...visit, ...properties },
    timestamp: Date.now(),
    uuid: crypto.randomUUID(),
  };
  if (posthog) send(queuedEvent);
  else if (pending.length < maxPending) {
    pending.push(queuedEvent);
    writePending();
  }
}

export function authStarted() {
  track("auth_started");
  if (!enabled) return;
  // The page is about to go to Google, so give the SDK a chance to send
  startNow?.();
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
