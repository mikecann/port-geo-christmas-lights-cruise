export function findUnusedPort(): number {
  // Simple approach: pick a random port in the ephemeral range
  // A more robust solution would actually bind to port 0 to get an OS-assigned port
  return 10000 + Math.floor(Math.random() * 50000);
}

export async function waitForHttpOk(
  url: string,
  timeoutMs = 30000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;
  while (true) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.ok || (res.status >= 300 && res.status < 400)) return;
    } catch {}
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      throw new Error(`Timed out waiting for ${url} to become ready`);
    const delay = Math.min(200 * Math.pow(1.5, attempts), remaining);
    await new Promise((r) => setTimeout(r, delay));
    attempts++;
  }
}
