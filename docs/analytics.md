# Competition analytics plan

Status: implementation ready to ship with collection disabled. The PostHog project is Personal / Port Geographe Christmas Lights (598745, US Cloud), with IP discard enabled and replay declined. Keep `VITE_ANALYTICS_ENABLED=false` until the live setup and payload verification below are complete and production collection is approved. Merging main triggers Cloudflare Workers Builds, so merging this disabled implementation and enabling collection are separate release steps. No Convex schema changes are needed.

## Setup

1. Use [Port Geographe Christmas Lights](https://us.posthog.com/project/598745/settings/project-details) in Personal, US Cloud. Use the public project token in `VITE_POSTHOG_KEY` and its ingestion host in `VITE_POSTHOG_HOST`. Never put a personal API key into Vite variables.
2. In PostHog, enable Discard IP data and disable session replay. GeoIP remains disabled unless `VITE_ANALYTICS_GEOIP_ENABLED=true`; see the approximate-geography setup below. Network requests necessarily expose the connection IP to the service; IP discard is a project setting, not a claim of anonymous transport.
3. Review the site's privacy notice for this narrow analytics collection, then obtain Michael's approval before setting `VITE_ANALYTICS_ENABLED=true` in production build configuration. Vite embeds these variables at build time. Missing configuration, DNT, test mode, or inaccessible session storage disables collection.
4. Verify in an isolated preview with a test project and synthetic data: inspect outgoing requests for the allowlist below, complete the OAuth return, test successful and rejected votes, and check dashboards. Do not run test votes against production.
5. Create the dashboards below in that project. Dashboard creation is still pending. Rollback: set enabled to false and rebuild/redeploy through the approved release process.

Live setup checkpoint (September 8): GeoIP enrichment is active and IP discard is on. The subsequent geography filter has not been saved or verified, and no production collection is enabled. The existing `mikecann.blog` project (73165) was preserved and moved into Personal. Deletion of the obsolete playground organization did not complete in the UI and remains outstanding.

## What is collected

Only named custom events. The client sends no location fields; optional server-side GeoIP is described below. No autocapture, replay, heatmaps, exception capture, surveys, feature flag requests, raw URLs, titles, referrers, query strings, form content, user IDs, emails, addresses, or coordinates. The final `before_send` boundary rebuilds properties from an allowlist, including anonymous analytics identifiers, public entry/competition IDs, category, named page/surface, share source, traffic channel, and an entrant boolean. Public entry IDs can be linked to public competition entries; these are pseudonymous analytics, not a promise of irreversible anonymity.

A random per-tab identity and first landing attribution survive same-tab OAuth redirects in session storage. State expires on a subsequent page load after 30 minutes. Open pages retain their identity until reloaded; this is not a cross-device or permanent person identifier. No PostHog identify calls or person profiles. New tabs, cleared storage, DNT, blockers, missed callbacks, and network failure cause undercounting. Backend vote records remain the authority.

## Approximate visitor geography

Michael requested country, region and approximate city reporting on September 8. Keep IP discard on. Set `VITE_ANALYTICS_GEOIP_ENABLED=true` only after configuring and verifying GeoIP enrichment in PostHog with a subsequent transformation that retains only the desired country, subdivision/region and city names/codes from GeoIP. Drop all other GeoIP fields, including latitude, longitude, postal code and accuracy radius, and check nested person-property updates too. Replay and person profiles remain disabled.

This filtering must happen on the server after enrichment: the browser's `before_send` cannot redact fields added later. Until that is verified, the example configuration leaves GeoIP off. The master collection flag still stays off until production approval.

Add a Visitor geography dashboard: unique `visit_started` by `$geoip_country_name`, then `$geoip_subdivision_1_name`, then `$geoip_city_name`; retain an Unknown bucket and compare conversion rates only with adequate sample sizes. This describes the visitor's approximate network location at the time, not their home or physical attendance. Mobile networks, VPNs and privacy relays can return a distant city. Do not use it for voting eligibility. Describe approximate location in the privacy notice and avoid publishing small geographic groups.

References: [PostHog GeoIP](https://posthog.com/docs/cdp/transformations/template-geoip), [MaxMind accuracy limitations](https://support.maxmind.com/knowledge-base/articles/maxmind-geolocation-accuracy).

## Event definitions

| Event                                                                     | Trigger and interpretation                                                                                                                                                                     |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visit_started`                                                           | New anonymous attribution window on page load. Includes channel and, for tagged entry links, `referral_entry_id`.                                                                              |
| `page_viewed`                                                             | SPA route transition, with a fixed route name. Admin and test routes excluded.                                                                                                                 |
| `entry_viewed`                                                            | Approved entry data rendered on detail page or map popup. `surface` distinguishes them.                                                                                                        |
| `share_intent`                                                            | Social button, copy button, or native share button pressed. Includes entry, source, and `is_entrant` where the authenticated owner is known. Anonymous ownership is unknown and reports false. |
| `native_share_resolved`                                                   | Browser share promise resolved. Not proof of delivery, publishing, reading, or a resulting visit. Copy is also intent only.                                                                    |
| `vote_auth_required`                                                      | Unauthenticated voter reaches an entry's voting modal.                                                                                                                                         |
| `vote_opened`                                                             | Authenticated voting modal displayed.                                                                                                                                                          |
| `vote_submitted`                                                          | Cast-vote mutation starts.                                                                                                                                                                     |
| `vote_succeeded` / `vote_failed`                                          | Mutation resolves / rejects. Errors contain no message text. Success is client-observed server acknowledgement, not an independent authoritative ledger.                                       |
| `vote_cancelled`                                                          | Cancellation mutation resolves. Track separately; success events are gross actions, not net active votes.                                                                                      |
| `auth_started` / `auth_succeeded` / `auth_failed`                         | Google auth initiated / authenticated return observed within 30 minutes / immediate initiation error. Cancelled or failed external redirects appear as drop-off.                               |
| `entry_signup_started` / `entry_signup_succeeded` / `entry_signup_failed` | Competition draft creation mutation starts / resolves / rejects. This is entrant signup, not Google account creation.                                                                          |
| `entry_submit_started` / `entry_submit_succeeded` / `entry_submit_failed` | Submission action starts / resolves / rejects. Success means the action completed, not admin approval.                                                                                         |
| `ticket_link_clicked`                                                     | Reserved contract for a future external ticket CTA. Current tickets page has no external checkout, so this event has no producer yet. Never interpret a click as a purchase.                   |

Google's combined sign-in/signup flow does not expose new-account creation to the frontend. True account-signup counts require a backend auth creation event in a later change. Do not label auth success as signup. Existing seasonal gates remain unchanged.

## Attribution and link conventions

Generated share links look like `/entries/ENTRY_ID?utm_source=facebook&utm_medium=entry_share`. Sources are fixed: facebook, twitter (X), whatsapp, linkedin, email, copy, native, qr. For QR artwork use `/entries/ENTRY_ID?utm_source=qr&utm_medium=qr`, generated with `shareLink(origin, entryId, "qr")`. Generic QR campaigns may use `/?utm_source=qr&utm_medium=qr` without an entry association.

Only recognized source/medium pairs are retained. Arbitrary UTM campaign/content/term values and query parameters are dropped. Recognized social referrer hosts map to social; other external hosts map to referral without retaining the hostname. No referrer means `direct_unknown`, which includes untagged private messaging and stripped attribution.

Attribution is first landing within this tab's window. It survives internal navigation and OAuth. A later tagged link within the same window does not overwrite it. `source` on a share event describes that outgoing intent; `channel` and `referral_entry_id` still describe the visitor's original arrival. Tags can be copied or forged, so this measures association, not verified causation. There is no individual share-recipient matching or incentive attribution.

## Dashboards to create

Use the competition date range, exclude staff/test activity, and retain `competition_id` filters for entry events where available. Funnel conversion windows below are 30 minutes and count unique anonymous visitors, not event totals. Use the same definition consistently when comparing channels.

| Dashboard / insight | Configuration                                                                                                                                                                    | Decision                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Acquisition         | Daily unique `visit_started`, breakdown `channel`, then `source`                                                                                                                 | QR versus social versus direct/unknown reach                                                |
| Entrant sharing     | `share_intent` totals and unique visitors, filter `is_entrant=true`, breakdown `entry_id` and `source`                                                                           | Which entrants initiate sharing and where                                                   |
| Referral outcomes   | `visit_started` -> `entry_viewed` -> `vote_succeeded`, breakdown `referral_entry_id` and `channel`                                                                               | Referred visits and subsequent votes; distinguish voted-for `entry_id` from referring entry |
| Voting funnel       | `entry_viewed` -> `vote_opened` -> `vote_submitted` -> `vote_succeeded`, hold `entry_id` constant                                                                                | Largest voting drop-off; breakdown category at submission/success                           |
| Auth barrier        | `vote_auth_required` -> `auth_started` -> `auth_succeeded` -> `vote_opened` -> `vote_succeeded`                                                                                  | Lost voters around Google login                                                             |
| Vote reliability    | Daily submitted/succeeded/failed totals by category, plus cancellations separately                                                                                               | Failure rate, gross successful vote actions; reconcile against backend active-vote totals   |
| Entrant onboarding  | `entry_signup_started` -> `entry_signup_succeeded` -> `entry_submit_started` -> `entry_submit_succeeded`; use a 7-day window only if longer-lived identity is separately adopted | Where entrants stop; current tab identity limits long journeys                              |
| Tickets             | `page_viewed` filtered to `page=tickets`; add `ticket_link_clicked` once checkout exists                                                                                         | Ticket-page interest now, outbound intent later; purchases need ticket-provider integration |

A funnel abandonment is absence of the next observed step within its window. It does not establish why someone left. Compare counts with sample sizes and inspect failure trends before changing competition rules.

## Source documentation

Implementation checked against the current official [JavaScript configuration](https://posthog.com/docs/libraries/js/config), [data collection controls](https://posthog.com/docs/privacy/data-collection), and [event redaction guidance](https://posthog.com/tutorials/web-redact-properties). `posthog-js` is locked in `bun.lock`. Recheck configuration and the privacy-boundary tests on SDK upgrades.

## Verification completed in this worktree

- TypeScript and unit suite: 64 passed, 4 existing skipped tests. Includes 15 analytics tests covering payload redaction, unwanted automatic events, QR/social attribution, OAuth reload continuity, disabled mode, DNT/test mode, blocked storage, true mutation outcomes, SDK capture failure, and auth-return deduplication.
- ESLint and `git diff --check`: passed.
- Production build: passed. PostHog is a separate deferred chunk and is not loaded when disabled.
- Browser-to-PostHog delivery and real OAuth/voting flows have not been exercised. They require a selected test project and a configured preview backend; no production votes were cast.
- The Bun lockfile also reconciles existing root dependency declarations from `latest` to the ranges already in package.json; existing resolved dependency versions were retained.
