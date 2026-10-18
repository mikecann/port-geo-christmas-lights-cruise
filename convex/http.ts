import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { httpApiOgEntryReturnValidator } from "../shared/validators";
import { iife } from "../shared/misc";

const http = httpRouter();

auth.addHttpRoutes(http);

// Public OG metadata endpoint used by the Cloudflare Worker to fetch share
// data, by entry id or by this year's entry number (the /v/<number> links)
http.route({
  path: "/api/og/entry",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const entryId = url.searchParams.get("entryId");
    const entryNumber = url.searchParams.get("entryNumber");
    if (!entryId && !(entryNumber && /^\d{1,4}$/.test(entryNumber)))
      return new Response(
        JSON.stringify({ error: "Missing entryId or entryNumber query param" }),
        { status: 400, headers: { "content-type": "application/json" } },
      );

    // Load entry
    const entry = entryId
      ? await ctx.runQuery(api.public.entries.find, { entryId })
      : await ctx.runQuery(api.public.entries.findByNumber, {
          entryNumber: Number(entryNumber),
        });

    if (!entry)
      return new Response(JSON.stringify({ error: "Entry not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });

    const firstPhoto = await ctx.runQuery(api.public.photos.findFirstForEntry, {
      entryId: entry._id,
    });

    // Determine first photo URL if available
    const imageUrl = iife(() => {
      if (!firstPhoto) return null;
      if (firstPhoto.kind === "mock")
        return `/mockPhotos/${firstPhoto.mockPath}`;
      return firstPhoto.url;
    });

    const title = entry.name || "Christmas Lights Entry";
    const description =
      entry.houseAddress.address ||
      "Check out this Port Geographe Christmas Lights entry!";

    return new Response(
      JSON.stringify(
        httpApiOgEntryReturnValidator.parse({
          title,
          description,
          imageUrl,
        }),
      ),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          // Cache for a bit at the edge; FB also caches
          "cache-control": "public, max-age=300",
        },
      },
    );
  }),
});

export default http;
