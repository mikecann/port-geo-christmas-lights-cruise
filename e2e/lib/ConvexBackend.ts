import { spawn, ChildProcess, spawnSync } from "child_process";
import { mkdirSync } from "fs";
import { join } from "path";
import { downloadConvexBinary } from "./downloadConvexBinary";
import { ConvexHttpClient } from "convex/browser";
import { findUnusedPort, waitForHttpOk } from "./lib";

const INSTANCE_NAME = "carnitas";
const INSTANCE_SECRET =
  "4361726e697461732c206c69746572616c6c79206d65616e696e6720226c6974";
const ADMIN_KEY =
  "0135d8598650f8f5cb0f30c34ec2e2bb62793bc28717c8eb6fb577996d50be5f4281b59181095065c5d0f86a2c31ddbe9b597ec62b47ded69782cd";

export class ConvexBackend {
  public port?: number;
  public siteProxyPort?: number;
  public process?: ChildProcess;
  public readonly adminKey = ADMIN_KEY;
  public backendUrl?: string;
  private _client?: ConvexHttpClient;

  private readonly projectDir: string;
  private readonly stdio: "inherit" | "ignore" | ["ignore", "pipe", "pipe"];

  get client(): ConvexHttpClient {
    if (!this._client) throw new Error("Backend not initialized");
    return this._client;
  }

  constructor(
    options: {
      projectDir?: string;
      stdio?: "inherit" | "ignore" | ["ignore", "pipe", "pipe"];
    } = {},
  ) {
    this.projectDir = options.projectDir ?? process.cwd();
    this.stdio = options.stdio ?? "inherit";
  }

  async init(): Promise<void> {
    const backendDir = join(this.projectDir, ".convex-e2e-test");

    console.log("🚀 Starting Convex backend...");
    await this.startBackend(backendDir);
    console.log(`✅ Backend running on port ${this.port}`);

    console.log("📦 Deploying Convex code...");
    await this.deploy();
    console.log("✅ Deploy successful!");

    this.backendUrl = `http://localhost:${this.port}`;

    console.log(`✅ Convex backend ready at ${this.backendUrl}\n`);
  }

  private async startBackend(backendDir: string): Promise<void> {
    const storageDir = join(backendDir, "convex_local_storage");
    mkdirSync(storageDir, { recursive: true });

    const sqlitePath = join(backendDir, "convex_local_backend.sqlite3");
    const convexBinary = await downloadConvexBinary();

    this.port = findUnusedPort();
    this.siteProxyPort = findUnusedPort();

    this.process = spawn(
      convexBinary,
      [
        "--port",
        String(this.port),
        "--site-proxy-port",
        String(this.siteProxyPort),
        "--instance-name",
        INSTANCE_NAME,
        "--instance-secret",
        INSTANCE_SECRET,
        "--local-storage",
        storageDir,
        sqlitePath,
      ],
      {
        cwd: backendDir,
        stdio: this.stdio,
        detached: false,
      },
    );

    await this.healthCheck();

    if (this.process?.exitCode !== null) {
      throw new Error("Convex process failed to start");
    }
  }

  private async healthCheck(): Promise<void> {
    if (!this.port) throw new Error("Port not set for health check");
    const url = `http://localhost:${this.port}/version`;
    await waitForHttpOk(url, 10_000);
  }

  private async deploy(): Promise<void> {
    if (!this.port) throw new Error("Backend not started");

    const backendUrl = `http://localhost:${this.port}`;
    console.log(`   Running: bunx convex deploy --url ${backendUrl}`);

    const deployResult = spawnSync(
      "bunx",
      ["convex", "deploy", "--admin-key", this.adminKey, "--url", backendUrl],
      {
        cwd: this.projectDir,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60000,
      },
    );

    if (deployResult.error)
      throw new Error(
        `Failed to spawn convex deploy: ${deployResult.error.message}`,
      );

    if (deployResult.status !== 0)
      throw new Error(
        `Failed to deploy (exit code ${deployResult.status}):\n${deployResult.stdout + deployResult.stderr}`,
      );

    await this.setEnv("IS_TEST", "true");
  }

  async setEnv(name: string, value: string): Promise<void> {
    if (!this.port) throw new Error("Backend not started");

    const backendUrl = `http://localhost:${this.port}`;
    const displayValue = value.length > 50 ? `${value.slice(0, 50)}...` : value;
    console.log(`   Setting env var ${name} = "${displayValue}"`);

    // Use the Convex Deployment API to set environment variables
    // https://docs.convex.dev/deployment-api/update-environment-variables
    const response = await fetch(
      `${backendUrl}/api/v1/update_environment_variables`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Convex ${this.adminKey}`,
        },
        body: JSON.stringify({
          changes: [
            {
              name,
              value,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to set ${name} env via API (${response.status}): ${errorText}`,
      );
    }

    console.log(`   ✓ Successfully set ${name}`);
  }

  async stop(): Promise<void> {
    if (!this.process || this.process.exitCode !== null) return;

    await new Promise<void>((resolve) => {
      this.process!.once("exit", () => resolve());
      this.process!.kill("SIGKILL");
      setTimeout(() => resolve(), 2000);
    });
  }

  async resetDatabase(): Promise<void> {
    if (!this.backendUrl) throw new Error("Backend URL not set");
    const adminClient = new ConvexHttpClient(this.backendUrl);

    // Use internal API to set admin authentication
    (adminClient as any).setAdminAuth(this.adminKey);

    console.log("🔄 Resetting database...");

    // Clear all scheduled functions first
    let scheduledJobsDeleted = 0;
    let scheduledCursor: string | null = null;

    do {
      const result = (await adminClient.query(
        "_system/frontend/paginatedScheduledJobs" as any,
        {
          componentId: null,
          paginationOpts: { cursor: scheduledCursor, numItems: 100 },
        },
      )) as {
        page: Array<{ _id: string }>;
        isDone: boolean;
        continueCursor: string;
      };

      if (result.page.length > 0) {
        const deleteResult = (await adminClient.mutation(
          "_system/frontend/deleteDocuments" as any,
          {
            componentId: null,
            toDelete: result.page.map((job) => ({
              id: job._id,
              tableName: "_scheduled_jobs",
            })),
          },
        )) as { success: boolean; error?: string };

        if (!deleteResult.success) {
          console.warn(
            `  Failed to delete scheduled jobs: ${deleteResult.error}`,
          );
        } else {
          scheduledJobsDeleted += result.page.length;
        }
      }

      scheduledCursor = result.isDone ? null : result.continueCursor;
    } while (scheduledCursor !== null);

    if (scheduledJobsDeleted > 0) {
      console.log(`  Cleared ${scheduledJobsDeleted} scheduled functions`);
    }

    // Clear all files from storage
    let filesDeleted = 0;
    let fileCursor: string | null = null;

    do {
      const result = (await adminClient.query(
        "_system/fileStorageV2/fileMetadata" as any,
        {
          componentId: null,
          paginationOpts: { cursor: fileCursor, numItems: 100 },
        },
      )) as {
        page: Array<{ _id: string }>;
        isDone: boolean;
        continueCursor: string;
      };

      if (result.page.length > 0) {
        await adminClient.mutation("_system/fileStorageV2/deleteFiles" as any, {
          componentId: null,
          storageIds: result.page.map((file) => file._id),
        });
        filesDeleted += result.page.length;
      }

      fileCursor = result.isDone ? null : result.continueCursor;
    } while (fileCursor !== null);

    if (filesDeleted > 0) {
      console.log(`  Cleared ${filesDeleted} files from storage`);
    }

    // Get all table names from the database
    const tableMapping = (await adminClient.query(
      "_system/frontend/getTableMapping" as any,
      { componentId: null },
    )) as Record<string, string>;

    // Filter out system tables (those starting with _)
    const tableNames = Object.values(tableMapping).filter(
      (name) => !name.startsWith("_"),
    );

    // Clear each table (may require multiple calls for large tables)
    for (const tableName of tableNames) {
      let cursor: string | null = null;
      let totalDeleted = 0;

      do {
        const result = (await adminClient.mutation(
          "_system/frontend/clearTablePage" as any,
          { tableName, cursor, componentId: null },
        )) as {
          deleted: number;
          hasMore: boolean;
          continueCursor: string | null;
        };

        totalDeleted += result.deleted;
        cursor = result.hasMore ? result.continueCursor : null;
      } while (cursor !== null);

      if (totalDeleted > 0) {
        console.log(`  Cleared ${totalDeleted} rows from ${tableName}`);
      }
    }

    console.log(
      `✅ Database reset complete (cleared ${tableNames.length} tables)`,
    );
  }
}
