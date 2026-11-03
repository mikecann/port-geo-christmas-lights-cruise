// Every deploy gives the build's JS and CSS files new hashed names and drops
// the old ones. Someone who had the site open before a deploy still runs the
// old build, so the next page they open asks for a file that's gone and its
// import() fails. Reloading picks up the new build, which has that page.

const RELOADED_AT_KEY = "staleBuildReloadedAt";
// A page that still fails this soon after a reload isn't a stale build (the
// network, or a broken page), so let the error show rather than loop
const RETRY_AFTER_MS = 60_000;

export interface ReloadDeps {
  storage: Pick<Storage, "getItem" | "setItem"> | undefined;
  reload: () => void;
  now: () => number;
  online: boolean;
}

function browserDeps(): ReloadDeps {
  let storage: Storage | undefined;
  try {
    storage = sessionStorage;
  } catch {
    // Some browsers throw just for touching it when storage is blocked
  }
  return {
    storage,
    reload: () => location.reload(),
    now: () => Date.now(),
    online: navigator.onLine,
  };
}

// True if it's OK to reload now, in which case it records the reload, so
// only call it right before reloading
function claimReload(deps: ReloadDeps): boolean {
  const { storage } = deps;
  // Without storage there's no way to tell a second failure from the first
  if (!storage) return false;
  try {
    const last = Number(storage.getItem(RELOADED_AT_KEY));
    if (last && deps.now() - last < RETRY_AFTER_MS) return false;
    storage.setItem(RELOADED_AT_KEY, String(deps.now()));
    return true;
  } catch {
    return false;
  }
}

// For a lazy page's import().catch(). Either reloads the site and returns a
// promise that never settles, so the page keeps its loading bar until the
// reload lands, or rejects with the original error for the error boundary.
export function recoverFromFailedPageLoad(
  error: unknown,
  deps: ReloadDeps = browserDeps(),
): Promise<never> {
  // Offline, a reload would only swap the site for the browser's offline page
  if (!deps.online || !claimReload(deps)) return Promise.reject(error);
  deps.reload();
  return new Promise<never>(() => {});
}
