import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// Pages that are lazy-loaded but are often the first page someone sees. An
// inline script starts their chunks downloading from the HTML, instead of
// waiting for the main bundle to run and ask for them.
const PRELOAD_PAGES = [
  { path: "^/$", module: "src/home/HomePage.tsx" },
  // /entries/<id> and /entries/<id>/vote, where the QR codes on house signs go
  { path: "^/entries/[^/]+(/vote)?/?$", module: "src/entries/EntryPage.tsx" },
];

function preloadFirstPages(): Plugin {
  return {
    name: "preload-first-pages",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, { bundle, chunk: entry }) {
        if (!bundle || !entry) return;
        const chunks = Object.values(bundle).filter((c) => c.type === "chunk");
        const chunkNamed = (fileName: string) =>
          chunks.find((c) => c.fileName === fileName);
        // Everything the HTML already loads: the entry and all it imports
        const alreadyLoaded = new Set<string>();
        const visitEntry = (fileName: string) => {
          if (alreadyLoaded.has(fileName)) return;
          alreadyLoaded.add(fileName);
          chunkNamed(fileName)?.imports.forEach(visitEntry);
        };
        visitEntry(entry.fileName);
        const pages = PRELOAD_PAGES.map(({ path, module }) => {
          const page = chunks.find((c) => c.facadeModuleId?.endsWith(module));
          if (!page) throw new Error(`No chunk found for ${module}`);
          // The page and everything it imports that the main bundle doesn't
          const js = new Set<string>();
          const css = new Set<string>();
          const visit = (fileName: string) => {
            if (js.has(fileName) || alreadyLoaded.has(fileName)) return;
            js.add(fileName);
            const c = chunkNamed(fileName);
            c?.viteMetadata?.importedCss.forEach((f) => css.add(f));
            c?.imports.forEach(visit);
          };
          visit(page.fileName);
          return { path, js: [...js], css: [...css] };
        });
        const script = `(function (pages) {
  var page = pages.find(function (p) { return new RegExp(p.path).test(location.pathname); });
  if (!page) return;
  function add(rel, href, as) {
    var link = document.createElement("link");
    link.rel = rel;
    link.href = "/" + href;
    link.crossOrigin = "";
    if (as) link.as = as;
    document.head.appendChild(link);
  }
  page.js.forEach(function (f) { add("modulepreload", f); });
  page.css.forEach(function (f) { add("preload", f, "style"); });
})(${JSON.stringify(pages)});`;
        return [{ tag: "script", children: script, injectTo: "head" }];
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare(), preloadFirstPages()],
  server: {
    host: true,
  },
});
