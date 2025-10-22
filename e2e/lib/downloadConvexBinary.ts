import {
  createWriteStream,
  existsSync,
  mkdirSync,
  chmodSync,
  createReadStream,
} from "fs";
import { rename, rm } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { get as httpsGet } from "https";
import unzipper from "unzipper";

interface GitHubRelease {
  tag_name: string;
  assets: Array<{ name: string; browser_download_url: string }>;
}

async function fetchConvexReleases(): Promise<GitHubRelease[]> {
  return new Promise((resolve, reject) => {
    const url =
      "https://api.github.com/repos/get-convex/convex-backend/releases?per_page=50";
    httpsGet(url, { headers: { "User-Agent": "node" } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch releases: ${res.statusCode}`));
        return;
      }

      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error as Error);
        }
      });
    }).on("error", reject);
  });
}

function getPlatformTarget(): string {
  const arch =
    process.arch === "x64"
      ? "x86_64"
      : process.arch === "arm64"
        ? "aarch64"
        : process.arch;

  if (process.platform === "darwin")
    return `convex-local-backend-${arch}-apple-darwin`;
  if (process.platform === "linux")
    return `convex-local-backend-${arch}-unknown-linux-gnu`;
  if (process.platform === "win32")
    return `convex-local-backend-${arch}-pc-windows-msvc`;

  throw new Error(`Unsupported platform: ${process.platform}`);
}

function findAsset(
  releases: GitHubRelease[],
  target: string,
): {
  asset: { name: string; browser_download_url: string };
  version: string;
} | null {
  for (const release of releases) {
    const asset = release.assets.find((a) => a.name.includes(target));
    if (asset) return { asset, version: release.tag_name };
  }
  return null;
}

export async function downloadConvexBinary(): Promise<string> {
  const { isWindows, target } = (() => {
    const isWindows = process.platform === "win32";
    return { isWindows, target: getPlatformTarget() };
  })();

  const releases = await fetchConvexReleases();
  const found = findAsset(releases, target);
  if (!found) throw new Error(`No Convex binary asset matches '${target}'`);

  const { asset, version } = found;
  const binaryDir = join(homedir(), ".convex-e2e", "releases");
  mkdirSync(binaryDir, { recursive: true });

  const binaryName = `convex-local-backend-${version}${isWindows ? ".exe" : ""}`;
  const binaryPath = join(binaryDir, binaryName);
  if (existsSync(binaryPath)) return binaryPath;

  const zipPath = join(binaryDir, asset.name);
  console.log(`Downloading Convex backend ${version}...`);
  await downloadFile(asset.browser_download_url, zipPath);
  console.log(`Downloaded: ${asset.name}`);

  await extractZip(zipPath, binaryDir);
  const extracted = join(
    binaryDir,
    `convex-local-backend${isWindows ? ".exe" : ""}`,
  );
  await rename(extracted, binaryPath);
  if (!isWindows) chmodSync(binaryPath, 0o755);
  await rm(zipPath);
  console.log(`Binary ready at: ${binaryPath}`);
  return binaryPath;
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    httpsGet(url, { headers: { "User-Agent": "node" } }, (res) => {
      const isRedirect = res.statusCode === 302 || res.statusCode === 301;
      if (isRedirect) {
        const location = res.headers.location;
        if (!location) {
          reject(new Error(`Redirect without location for ${url}`));
          return;
        }
        httpsGet(location, (redirectRes) =>
          pipeTo(destPath, redirectRes, resolve, reject),
        ).on("error", reject);
        return;
      }
      pipeTo(destPath, res, resolve, reject);
    }).on("error", reject);
  });
}

function pipeTo(
  destPath: string,
  stream: NodeJS.ReadableStream,
  resolve: () => void,
  reject: (err: Error) => void,
): void {
  const out = createWriteStream(destPath);
  stream.pipe(out);
  out.on("finish", () => {
    out.close();
    resolve();
  });
  out.on("error", reject);
}

function extractZip(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: destDir }))
      .on("close", resolve)
      .on("error", reject);
  });
}
