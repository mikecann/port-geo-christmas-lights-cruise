/* global process, console */
// Print-ready A0 entrant signs, one per number, each with a QR code that opens
// that number's vote page (/v/<number>). Super Signs print them on 5 mm
// corflute, single sided.
//
//   node scripts/signs/build.mjs            all of DEFAULT_ENTRY_NUMBER_RANGE
//   node scripts/signs/build.mjs 26         just one, handy for checking
//   node scripts/signs/build.mjs 1-10
//
// Writes work/signs/: one PDF per sign, signs-all.pdf with every sign as a
// page, and a PNG preview of the first. Needs a Chromium; it uses Playwright's
// cached one, or set CHROME to another.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import QRCode from "qrcode";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const outDir = join(root, "work/signs");

const SITE = "https://portgeochristmascruise.com.au";

// A0 landscape, in mm
const W = 1189;
const H = 841;

const constants = readFileSync(join(root, "shared/constants.ts"), "utf8");
const [, min, max] = constants.match(
  /DEFAULT_ENTRY_NUMBER_RANGE = \{ min: (\d+), max: (\d+) \}/,
);

function numbersFromArgs(arg) {
  if (!arg) return range(Number(min), Number(max));
  const [a, b] = arg.split("-").map(Number);
  return range(a, b ?? a);
}

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  const dirs = existsSync(cache)
    ? readdirSync(cache)
        .filter((d) => d.startsWith("chromium_headless_shell-"))
        .sort()
        .reverse()
    : [];
  for (const d of dirs) {
    const bin = join(
      cache,
      d,
      "chrome-headless-shell-mac-arm64/chrome-headless-shell",
    );
    if (existsSync(bin)) return bin;
  }
  throw new Error(
    "No Chromium found. Set CHROME to a Chrome or Chromium binary.",
  );
}

// The QR as one SVG path of whole modules, so it prints as crisp vectors.
// Medium error correction keeps it to 29 x 29 modules (version 3) for these
// URLs: fewer, bigger squares scan from further away across the canal.
function qrSvg(text) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  // get() is (row, column), so y comes first. Swapping them draws the code
  // mirrored across its diagonal: forgiving readers still decode it, but
  // plenty of phone cameras won't.
  const dark = (x, y) => qr.modules.get(y, x);
  let d = "";
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (dark(x, y)) d += `M${x} ${y}h1v1h-1z`;
  return {
    size,
    version: qr.version,
    darkCells: () => {
      const cells = new Set();
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) if (dark(x, y)) cells.add(`${x},${y}`);
      return cells;
    },
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><path d="${d}" fill="#000"/></svg>`,
  };
}

const title = readFileSync(join(here, "assets/title.svg"), "utf8");
const houses = readFileSync(join(here, "assets/houses.svg"), "utf8");
const font = pathToFileURL(join(here, "fonts/MerriweatherSans.ttf")).href;

// Layout, all in mm. The QR panel is white with a 4-module quiet zone.
const QR_PANEL = 620;
const MARGIN = 55;
const LEFT_W = W - MARGIN * 2 - QR_PANEL - 45;

function signPage(n) {
  const qr = qrSvg(`${SITE}/v/${n}`);
  const quiet = 4;
  const module = QR_PANEL / (qr.size + quiet * 2);
  return {
    qr,
    html: `<section class="sign">
  <div class="left">
    <div class="title">${title}</div>
    <div class="entrant">ENTRANT</div>
    <div class="number">${n}</div>
  </div>
  <div class="scene">${houses}</div>
  <div class="qr" style="padding:${quiet * module}mm">${qr.svg}</div>
  <div class="scan">Scan to vote</div>
</section>`,
  };
}

const css = `
@font-face { font-family: "Merriweather Sans"; src: url("${font}"); font-weight: 300 800; }
@page { size: ${W}mm ${H}mm; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #0b1c3a; }
.sign {
  position: relative; width: ${W}mm; height: ${H}mm; overflow: hidden;
  background: #0b1c3a; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: "Merriweather Sans"; font-weight: 800;
  page-break-after: always; break-after: page;
}
.left { position: absolute; left: ${MARGIN}mm; top: 45mm; width: ${LEFT_W}mm; }
.title svg { width: ${LEFT_W}mm; height: auto; display: block; }
.entrant { margin-top: 22mm; font-size: 62mm; line-height: 1; letter-spacing: 3mm; text-align: center; }
.number { font-size: 315mm; line-height: 0.82; margin-top: 14mm; text-align: center; letter-spacing: -8mm; }
.scene { position: absolute; left: 0; bottom: 0; width: ${MARGIN + LEFT_W + 45}mm; }
.scene svg { width: 100%; height: auto; display: block; }
.qr { position: absolute; right: ${MARGIN}mm; top: 70mm; width: ${QR_PANEL}mm; height: ${QR_PANEL}mm; background: #fff; }
.qr svg { width: 100%; height: 100%; display: block; }
.scan { position: absolute; right: ${MARGIN}mm; width: ${QR_PANEL}mm; top: ${70 + QR_PANEL + 18}mm; text-align: center; font-size: 52mm; line-height: 1; }
`;

function htmlDoc(pages) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${pages.join("\n")}</body></html>`;
}

// The dark squares as the QR library's own SVG renderer draws them, which is
// known to be the right way round. Each row is "M0 <y+0.5>" then runs of
// "m<gap> 0" (skip) and "h<length>" (dark).
async function libraryDarkCells(text) {
  const svg = await QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
  });
  const path = svg.match(/stroke="#000000" d="([^"]+)"/)[1];
  const cells = new Set();
  let x = 0;
  let y = 0;
  for (const [, op, a, b] of path.matchAll(/([Mmh])([\d.]+)(?: ([\d.]+))?/g)) {
    if (op === "M") {
      x = Number(a);
      y = Math.floor(Number(b));
    } else if (op === "m") x += Number(a);
    else {
      for (let i = 0; i < Number(a); i++) cells.add(`${x + i},${y}`);
      x += Number(a);
    }
  }
  return cells;
}

const chrome = findChrome();
function printPdf(htmlPath, pdfPath) {
  execFileSync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--allow-file-access-from-files",
      "--no-pdf-header-footer",
      "--virtual-time-budget=5000",
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: "ignore" },
  );
}

mkdirSync(outDir, { recursive: true });
const numbers = numbersFromArgs(process.argv[2]);
const pages = [];
const versions = new Set();
for (const n of numbers) {
  const { html, qr } = signPage(n);
  // A flipped code still decodes in forgiving readers (jsQR did), so compare
  // every square with the library's own drawing instead of trusting a decode
  const ours = qr.darkCells();
  const theirs = await libraryDarkCells(`${SITE}/v/${n}`);
  if (ours.size !== theirs.size || [...ours].some((c) => !theirs.has(c)))
    throw new Error(`The QR code for sign ${n} doesn't match the library's`);
  versions.add(`v${qr.version} (${qr.size}x${qr.size})`);
  pages.push(html);
  const htmlPath = join(outDir, `sign-${n}.html`);
  writeFileSync(htmlPath, htmlDoc([html]));
  printPdf(htmlPath, join(outDir, `sign-${String(n).padStart(2, "0")}.pdf`));
}
if (numbers.length > 1) {
  const allHtml = join(outDir, "signs-all.html");
  writeFileSync(allHtml, htmlDoc(pages));
  printPdf(allHtml, join(outDir, "signs-all.pdf"));
}

// A small PNG of the first sign, to eyeball the layout
const first = join(outDir, `sign-${numbers[0]}.html`);
execFileSync(
  chrome,
  [
    "--headless",
    "--disable-gpu",
    "--allow-file-access-from-files",
    "--hide-scrollbars",
    "--virtual-time-budget=5000",
    "--force-device-scale-factor=0.4",
    `--window-size=${Math.round((W / 25.4) * 96)},${Math.round((H / 25.4) * 96)}`,
    `--screenshot=${join(outDir, `preview-${numbers[0]}.png`)}`,
    pathToFileURL(first).href,
  ],
  { stdio: "ignore" },
);

console.log(
  `Built ${numbers.length} sign(s) in ${outDir}, QR ${[...versions].join(", ")}`,
);
