import type { Breadcrumb, ErrorEvent } from "@sentry/react";

// A public client key: it ships in the bundle whatever we do.
const DSN =
  "https://99bc5768435a1fe2c275c223f4dcd47b@o4508736647266304.ingest.us.sentry.io/4512336957734912";

const PRODUCTION_HOSTS = [
  "portgeochristmascruise.com.au",
  "www.portgeochristmascruise.com.au",
];

// Production only: an agent watches this Sentry project and opens a thread for
// anything serious, and agents test this site all day on localhost, `vite dev`
// and preview URLs. Only a production build served from the real site reports.
// The SDK (about 30 kB gzipped) is loaded separately, like PostHog, so it stays
// off the first page's critical path and is never fetched anywhere else.
export async function initSentry() {
  if (
    !import.meta.env.PROD ||
    import.meta.env.VITE_IS_TEST_MODE === "true" ||
    !PRODUCTION_HOSTS.includes(location.hostname)
  )
    return false;
  // Errors while the SDK downloads (a startup crash, say) are held here and
  // sent once it's ready, since its own handlers aren't installed until then
  const early: unknown[] = [];
  const onError = (event: WindowEventMap["error"]) =>
    early.push(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) =>
    early.push(event.reason);
  addEventListener("error", onError);
  addEventListener("unhandledrejection", onRejection);
  try {
    // Destructured so the bundler keeps only what's used
    const { init, captureException } = await import("@sentry/react");
    init({
      dsn: DSN,
      environment: "production",
      release: __SENTRY_RELEASE__,
      // Errors only: no tracing, replay or profiling, and no session pings
      tracesSampleRate: 0,
      // No IP address, cookies, query strings or request bodies. The default
      // (userInfo: true) would have Sentry keep each visitor's IP address.
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: { allow: ["User-Agent"] },
        urlQueryParams: false,
        httpBodies: [],
      },
      integrations: (defaults) =>
        defaults.filter((integration) => integration.name !== "BrowserSession"),
      initialScope: { tags: { component: "web" } },
      beforeBreadcrumb: scrubBreadcrumb,
      beforeSend: scrubEvent,
    });
    for (const error of early) captureException(error);
  } finally {
    removeEventListener("error", onError);
    removeEventListener("unhandledrejection", onRejection);
  }
  return true;
}

// Strips the query and hash, which can hold a sign-in code or share tags
export function pathOnly(url: unknown): string | undefined {
  if (typeof url !== "string") return undefined;
  return url.split(/[?#]/)[0];
}

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
// Phone numbers and other long digit runs. Entry numbers and ids are shorter.
const LONG_NUMBER = /\+?\d[\d ()-]{7,}\d/g;

// Members of the public use this site, so error text must not carry their
// emails or phone numbers (a server error can echo what they typed).
export function scrubText(text: string): string {
  return text.replace(EMAIL, "[email]").replace(LONG_NUMBER, "[number]");
}

// Console, click and network breadcrumbs can hold typed addresses, emails and
// Maps search URLs, so only page changes are kept, as paths.
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  if (crumb.category !== "navigation") return null;
  return {
    ...crumb,
    data: { from: pathOnly(crumb.data?.from), to: pathOnly(crumb.data?.to) },
  };
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  if (event.request)
    event.request = {
      url: pathOnly(event.request.url),
      headers: event.request.headers?.["User-Agent"]
        ? { "User-Agent": event.request.headers["User-Agent"] }
        : undefined,
    };
  if (event.message) event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? [])
    if (exception.value) exception.value = scrubText(exception.value);
  return event;
}
