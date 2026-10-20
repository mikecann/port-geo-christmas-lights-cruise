![screenshot 1](./docs/ss1.png)

# Port Geographe Christmas Lights Cruise

A web application for the Port Geographe Christmas Lights competition and boat cruise event. Allows residents to register their decorated homes, visitors to view entries on an interactive map, and participate in community voting.

## Tech Stack

- **Frontend:** React + Vite + Mantine UI
- **Backend:** Convex (real-time database & serverless functions)
- **Package Manager:** Bun
- **Maps:** Google Maps integration
- **Auth:** Convex Auth

## Key Features

- Entry registration with photo uploads and geocoding
- Interactive map displaying all competition entries
- Community voting system
- Admin dashboard for managing entries and votes
- Email notifications
- Mobile-responsive design

## Development

This project uses [bun](https://bun.com/) for its package management so make sure you get that [installed](https://bun.com/) first.

```bash
# Install dependencies
bun install

# Run dev servers
bun run dev

# (in a separate terminal) run typecheck
bun run dev:ts
```

This will start the project up. The first time it runs it will ask you to setup a convex project, choose cloud (tho local might work too).

### Google Maps

The map uses Google Maps, to get that working you need to add `VITE_GOOGLE_MAPS_API_KEY` to the `.env.local`. To get one please see: https://developers.google.com/maps/documentation/embed/get-api-key

### Auth

This is a [convex auth](https://labs.convex.dev/auth) project, so make sure you run the init:

```bash
bunx @convex-dev/auth
```

Accept the defaults, this will add a few needed environment variables.

People can sign in two ways: with Google, or with a 6-digit code sent to their email (handy for ARG staff, whose Outlook addresses aren't Google accounts). Both end up as the same user if the email matches, ignoring case.

For Google, follow the steps here to set up a Google project and add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to the Convex deployment: https://labs.convex.dev/auth/config/oauth/google.

Email codes go out through Resend like the other emails, so the deployment needs `RESEND_API_KEY`. A code lasts 10 minutes, and each email can ask for 5 in a row, then one every 6 minutes.

An email only links to an existing user once it's verified, by Google or by using the code, If two users already share an email, a new way of signing in with it is turned away until an admin sorts that out by hand.

Emails saved before this were matched exactly and have no canonical email (used to stop one person voting from several spellings of the same inbox), and this year's votes from before then don't have the voter's canonical email saved on them, so run this once on each deployment after deploying it, before voting opens:

```bash
bunx convex run internal/users:normalizeEmails
```

#### Seeing codes on dev

Resend won't send from dev, so set `AUTH_LOG_SIGNIN_CODES=true` on the dev deployment and the codes appear in the Convex logs (`bunx convex logs`) instead of being emailed. Never set it on production. It only works when `SITE_URL` is `localhost` or `127.0.0.1`; anywhere else it's ignored and the code is emailed as usual.

#### Off-season sign-up lock

Outside the season two flags close sign-ups:

- `IS_SIGNUP_DISABLED=true` on the Convex deployment. This is the actual lock: existing accounts (admins included) can still sign in with Google or an email code, but neither can create new ones.
- `VITE_IS_SIGNUP_DISABLED=true` in the frontend build. This only swaps the sign-in page for an "under construction" message. Admins can still reach the sign-in options at `/signin?returnTo=/admin&unlock=true`.

Turn both off when sign-ups open.

#### Letting named people in, and making admins

Two more Convex env vars, each a comma-separated list of emails. Case and spaces around each email don't matter.

- `SIGNUP_ALLOWED_EMAILS`: these people can create an account even while `IS_SIGNUP_DISABLED` is on.
- `COMPETITION_ADMIN_EMAILS`: these people are made competition admins when they sign in, with Google or a code. They can create an account while sign-ups are closed too, so there's no need to list them twice. Taking someone off the list doesn't remove the role; do that on the admin People page (`/admin/people`), where competition admins can also add each other once that person has signed in.

For example: `COMPETITION_ADMIN_EMAILS=ZOliver@aigleroyal.com.au, TJulian@aigleroyal.com.au`. Send them to `/signin?returnTo=/admin&unlock=true` while the sign-in page is switched off.

### Voting

There are two public votes, and everyone gets one vote in each per competition, which they can change or remove until voting closes:

- **Best display.** It counts for In-Person Favourites when it's in person, and People's Choice when it isn't. They're separate pools: an in-person vote doesn't count for People's Choice too.
- **Most Jolly** (dancing, dressing up and festive fun). Only in-person votes are allowed; the vote mutation turns anything else away.

That's one vote per category per inbox too: accounts whose emails only differ by a `+tag`, or by dots for Gmail, share their votes. Entrants can't vote for their own entry in either. New Entrants and Judges' Favourites are judged, so they aren't voted on here.

2026 votes cast before Most Jolly became a public vote (there are some on dev) have no `category`. They count as best display (`voteCategoryOf` in `convex/features/votes/schema.ts`), and their counts were already in the right place, so there's no backfill. Changing one of those votes saves it with its category. 2025's votes have a category and none of the in-person fields; they stay viewable on the admin Votes page for 2025.

The vote counts come from `@convex-dev/aggregate` with one namespace per ranking, kept up to date by a trigger whenever a vote is cast, moved or removed: `in_person` (In-Person Favourites), `online` (People's Choice) and `most_jolly` (Most Jolly, shared with 2025's Most Jolly votes), plus `best_display` for 2025's best display votes.

The QR code on each house sign goes to `/v/<number>`, which opens this year's entry with that number. The QR code on the boat goes to `/vote`, where people type the number on the sign.

#### The in-person check

Convex can't see a voter's IP address, but the Cloudflare Worker can. `GET /api/geo` on the worker returns a token with Cloudflare's guess at where the visitor is (country, region, city, coordinates, timezone), signed with `GEO_TOKEN_SECRET` and good for 10 minutes. Each token has a random nonce and only works for one vote, so the vote page fetches a fresh one each time someone votes. The vote mutation checks the signature and the age, and records the nonce (an hourly cron clears old ones) so a token passed round or sent again can only count for People's Choice. A vote is in person only when the token is genuine, the country is in the competition's list (AU by default, and admins can narrow it to WA on the admin Votes page) and the voter answers "I've seen it" on the vote page's three-way switch (the vote button stays greyed out until they pick "I've seen it" or "I haven't seen it"). With "I've seen it" and a passing check, the vote page shows a Best display and a Most jolly button side by side; otherwise it shows one button, for best display. The location is saved on the vote so admins can review it.

The worker and Convex need the same secret. If either is missing, nobody's vote counts as in person and the vote page says so. Generate one with `openssl rand -base64 32`, then:

```bash
# Production: the worker secret, then the Convex env var
bunx wrangler secret put GEO_TOKEN_SECRET
npx convex env set GEO_TOKEN_SECRET '<the same secret>' --prod
```

For local dev, put `GEO_TOKEN_SECRET=<secret>` in `.dev.vars` (gitignored, read by the Vite Cloudflare plugin) and set the same value on your dev deployment with `npx convex env set GEO_TOKEN_SECRET '<secret>'`. Locally, Cloudflare's location is a guess from your own connection.

### Admin area

`/admin` is for competition admins (ARG) and system admins. It opens on an overview with the competition's status, switches to open and close entries and voting, and how many entries are waiting for review. The other pages are Entries (the review queue, then every entry), Numbers (the number range and which numbers are taken, kept for returning entrants or free), Votes (the three rankings, flagged votes and the CSV), and People (finding people and making them admins). System admins also get a Danger zone page with the testing tools and wipes. They also get Machines (`/admin/machines`), which draws the entry state machine from its rules, counts the entries in each state, shows one entry's state, timers and history, and lists failed timers to rearm. An entry's admin page links to it with "View in Machines".

### Production deployment

Production runs on the Convex deployment `shocking-robin-810` in Sydney (`aws-ap-southeast-2`, reference `production`), moved from US East on 18 October 2026. Merging to `main` deploys it: the Cloudflare Workers build runs `convex deploy` with a Sydney deploy key in its build variables, then builds the site against it. `convex.portgeochristmascruise.com.au` (HTTP actions, Google sign-in callbacks, the worker's OG lookups) points at Sydney too.

The old US deployment `fortunate-grouse-28` (reference `us-retired`) is still around as a fallback. Until it's deleted, the Convex CLI still treats it as the project's default production deployment, so don't run `npx convex deploy` or `--prod` commands from your machine: use `--deployment production`, or a Sydney deploy key in `CONVEX_DEPLOY_KEY`.

### Moving to a new deployment

Uploaded photos save their full file URL, which includes the deployment's host, so after importing an export (with file storage) into a new deployment they still point at the old one. Once the import is done, run this against the new deployment:

```bash
bunx convex run internal/photos:refreshPhotoUrls
```

It works through the photos 100 at a time, rescheduling itself until it's done, then logs how many it updated and how many have no stored file (each of those is logged and left alone). It only changes URLs that differ, so running it again is harmless.

### Testing

To typecheck the project and run the unit tests:

```bash
bun run test
```

CI runs this, plus `bun run lint` and `bun run format:check`, on every push and pull request to `main`.

### OG Tag

To make OG tags work (sharing on facebook etc) this project uses a tag-injection cloudflare worker (this project is hosted on cloudflare workers).

Thus `VITE_CONVEX_SITE_URL` is defined in `.env.local` which points to your deployment site url e.g. https://blessed-meadowlark-999.convex.site you will need to update this when going to production too.

### Todo

- Support videos for entries
