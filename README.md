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

Then because this project is using GoogleAuth only you will need to follow the steps here to setup a Google Project and add the required environment variables (AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET) to the convex deployment: https://labs.convex.dev/auth/config/oauth/google.

### Testing

If you want to run both the e2e and unit tests:

```bash
bun run test
```

E2E tests use [Stagehand](https://www.stagehand.dev/) which is an AI based testing library. Because its AI based it needs AI keys to operate correctly.

Create a `.env` in the root of the project and set `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY` if you want to change the model to use Gemini or something else instead.

### OG Tag

To make OG tags work (sharing on facebook etc) this project uses a tag-injection cloudflare worker (this project is hosted on cloudflare workers).

Thus `VITE_CONVEX_SITE_URL` is defined in `.env.local` which points to your deployment site url e.g. https://blessed-meadowlark-999.convex.site you will need to update this when going to production too.
