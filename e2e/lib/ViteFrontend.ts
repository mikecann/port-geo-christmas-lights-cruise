import { findUnusedPort, waitForHttpOk, onProcessExit } from "./lib";
import { execa, type ResultPromise } from "execa";
import kill from "tree-kill";

export class ViteFrontend {
  public port?: number;
  public process?: ResultPromise;
  public frontendUrl?: string;

  constructor() {}

  async init({ convexUrl }: { convexUrl: string }): Promise<void> {
    console.log(`🌐 Starting Vite server with convexUrl ${convexUrl}...`);

    this.port = findUnusedPort();

    this.process = execa(
      "bunx",
      ["vite", "--port", String(this.port), "--strictPort"],
      {
        env: {
          ...process.env,
          VITE_CONVEX_URL: convexUrl,
          VITE_IS_TEST_MODE: "true",
          CLOUDFLARE_ENV: "dev",
        },
        stdio: "ignore",
      },
    );

    // Handle process exit (expected when we call stop())
    this.process.catch(() => {
      // Process was terminated, this is expected
    });

    this.frontendUrl = `http://localhost:${this.port}`;
    await waitForHttpOk(this.frontendUrl);

    // Verify the process has a PID (started successfully)
    if (!this.process.pid)
      throw new Error("Vite process failed to start - no PID assigned");

    console.log(`✅ Vite server running at ${this.frontendUrl}\n`);

    onProcessExit(() => this.stop());
  }

  async stop(): Promise<void> {
    if (!this.process || this.process.pid === undefined) return;

    console.log(`🛑 Stopping Vite server...`);

    const pid = this.process.pid;
    try {
      // Try graceful SIGTERM first, tree-kill will kill all child processes
      await kill(pid, "SIGTERM");
    } catch (error) {
      console.warn(`Failed to terminate Vite server gracefully:`, error);
    }
  }
}
