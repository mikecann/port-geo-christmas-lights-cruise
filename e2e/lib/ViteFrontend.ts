import { spawn, ChildProcess } from "child_process";
import { findUnusedPort, waitForHttpOk } from "./lib";

export class ViteFrontend {
  public port?: number;
  public process?: ChildProcess;
  public frontendUrl?: string;

  constructor() {}

  async init({ convexUrl }: { convexUrl: string }): Promise<void> {
    console.log(`🌐 Starting Vite server with convexUrl ${convexUrl}...`);

    this.port = findUnusedPort();

    this.process = spawn(
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
        detached: false,
      },
    );

    this.frontendUrl = `http://localhost:${this.port}`;
    await waitForHttpOk(this.frontendUrl);

    if (this.process.exitCode !== null)
      throw new Error("Vite process exited early");

    console.log(`✅ Vite server running at ${this.frontendUrl}\n`);
  }

  async stop(): Promise<void> {
    if (!this.process || this.process.exitCode !== null) return;

    await new Promise<void>((resolve) => {
      this.process!.once("exit", () => resolve());
      this.process!.kill("SIGKILL");
      setTimeout(() => resolve(), 2000);
    });
  }
}
