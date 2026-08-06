import { Stagehand } from "@browserbasehq/stagehand";
import { routes } from "../src/routes";
import { beforeAll, afterAll, beforeEach } from "vitest";
import { api } from "../convex/_generated/api";
import { Route } from "type-route";
import { ConvexBackend } from "./lib/ConvexBackend";
import { ViteFrontend } from "./lib/ViteFrontend";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const models = {
  "google/gemini-flash-lite-latest": {
    name: "google/gemini-flash-lite-latest",
    inputPricePerToken: 0.1 / 1_000_000,
    outputPricePerToken: 0.4 / 1_000_000,
  },
  "google/gemini-2.5-flash": {
    name: "google/gemini-2.5-flash",
    inputPricePerToken: 0.3 / 1_000_000,
    outputPricePerToken: 2.5 / 1_000_000,
  },
  "google/gemini-2.5-pro": {
    name: "google/gemini-2.5-pro",
    inputPricePerToken: 1.25 / 1_000_000,
    outputPricePerToken: 2.5 / 1_000_000,
  },
  "openai/gpt-5-mini": {
    name: "openai/gpt-5-mini",
    inputPricePerToken: 0.25 / 1_000_000,
    outputPricePerToken: 2 / 1_000_000,
  },
};

export const setupE2E = () => {
  const backend = new ConvexBackend({
    projectDir: process.cwd(),
    stdio: "ignore",
  });
  const frontend = new ViteFrontend();

  const model = models["openai/gpt-5-mini"];

  const stagehand = new Stagehand({
    env: "LOCAL",
    model: model.name,
    localBrowserLaunchOptions: {
      headless: Boolean(process.env.CI),
    },
    verbose: 2,
    logger: createDetailedStagehandLogger(),
  });

  beforeAll(async () => {
    await backend.init();

    await frontend.init({ convexUrl: backend.backendUrl! });

    await stagehand.init();

    const authKeys = await generateTestKeys();
    await backend.setEnv("JWT_PRIVATE_KEY", authKeys.JWT_PRIVATE_KEY);
    await backend.setEnv("JWKS", authKeys.JWKS);
  });

  afterAll(async () => {
    await frontend.stop();
    await backend.stop();
    await stagehand.close();
    console.log("--- Run Finished ---");
    await logExpenseEstimate();
  });

  beforeEach(async () => {
    await backend.client.mutation(api.testing.testing.clearAll);
  });

  const getPage = () => {
    const page = stagehand.context.pages()[0];
    if (!page) throw new Error("Stagehand did not create a browser page");
    return page;
  };

  const logExpenseEstimate = async () => {
    const metrics = await stagehand.metrics;
    console.log({
      totalPromptTokens: metrics.totalPromptTokens,
      totalCompletionTokens: metrics.totalCompletionTokens,
    });

    const estimatedCost =
      metrics.totalPromptTokens * model.inputPricePerToken +
      metrics.totalCompletionTokens * model.outputPricePerToken;

    console.log(`Estimated cost (${model.name}): $${estimatedCost.toFixed(5)}`);
  };

  return {
    backend,
    frontend,
    stagehand,
    logExpenseEstimate,
    auth: {
      signInAs: async (options: AuthenticateOptions) => {
        const page = getPage();

        // Navigate to the test auth page
        await page.goto(`${frontend.frontendUrl}${routes.testAuth().href}`, {
          waitUntil: "networkidle",
        });

        // Fill in the email
        if (options.email) {
          await page
            .locator('[data-testid="test-auth-email"]')
            .fill(options.email);
        }

        // Fill in the name
        if (options.name) {
          await page
            .locator('[data-testid="test-auth-name"]')
            .fill(options.name);
        }

        // Set system admin checkbox
        if (options.isSystemAdmin) {
          await page.locator('[data-testid="test-auth-system-admin"]').click();
        }

        // Set competition admin checkbox
        if (options.isCompetitionAdmin) {
          await page
            .locator('[data-testid="test-auth-competition-admin"]')
            .click();
        }

        // Click the authenticate button
        await page.locator('[data-testid="test-auth-submit"]').click();

        // Wait for authentication to complete
        await waitFor(
          async () =>
            (await page
              .locator('[data-testid="test-auth-status"]')
              .textContent()) === "Authenticated!",
          10_000,
        );

        const user = await backend.client.query(
          api.testing.testing.getUserByEmail,
          {
            email: options.email,
          },
        );

        return user;
      },
    },
    goto: (route?: Route<typeof routes>) => {
      const page = getPage();
      const url = route
        ? `${frontend.frontendUrl}${route.href}`
        : frontend.frontendUrl!;
      return page.goto(url, { waitUntil: "networkidle" });
    },
  };
};

async function waitFor(check: () => Promise<boolean>, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out after ${timeoutMs}ms`);
}

type AuthenticateOptions = {
  email: string;
  name?: string;
  isSystemAdmin?: boolean;
  isCompetitionAdmin?: boolean;
};

/**
 * Generates RSA key pair for testing purposes.
 * Returns the keys in the format expected by Convex Auth.
 */
async function generateTestKeys(): Promise<{
  JWT_PRIVATE_KEY: string;
  JWKS: string;
}> {
  const keys = await generateKeyPair("RS256", {
    extractable: true,
  });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

  return {
    JWT_PRIVATE_KEY: privateKey.trimEnd().replace(/\n/g, " "),
    JWKS: jwks,
  };
}

interface LogLine {
  category?: string;
  message: string;
  level?: 0 | 1 | 2;
  timestamp?: string;
  auxiliary?: {
    executionTime?: { value: string; unit: string };
    sessionId?: string;
    url?: string;
    [key: string]: any;
  };
}

const createDetailedStagehandLogger = () => {
  const colors: Record<string, string> = {
    browser: "\x1b[34m", // blue
    action: "\x1b[32m", // green
    llm: "\x1b[35m", // magenta
    error: "\x1b[31m", // red
    stagehand: "\x1b[36m", // cyan
    cache: "\x1b[33m", // yellow
  };
  const reset = "\x1b[0m";

  return (logLine: LogLine) => {
    const category = logLine.category || "unknown";
    const color = colors[category] || reset;

    // Main log message
    console.log(`${color}[${category}]${reset} ${logLine.message}`);

    // Log auxiliary information if present
    if (logLine.auxiliary && Object.keys(logLine.auxiliary).length > 0) {
      const aux = logLine.auxiliary;

      // Log execution time if available
      if (aux.executionTime) {
        console.log(
          `  ⏱️  ${aux.executionTime.value}${aux.executionTime.unit}`,
        );
      }

      // Log URL if available
      if (aux.url) {
        const urlStr =
          typeof aux.url === "string"
            ? aux.url
            : JSON.stringify(aux.url, null, 2);
        console.log(`  🔗 ${urlStr}`);
      }

      // Log session ID if available
      if (aux.sessionId) {
        console.log(`  📍 Session: ${aux.sessionId}`);
      }

      // Log all other auxiliary data
      const otherKeys = Object.keys(aux).filter(
        (key) => !["executionTime", "url", "sessionId"].includes(key),
      );
      if (otherKeys.length > 0) {
        const otherData: Record<string, any> = {};
        for (const key of otherKeys) {
          otherData[key] = aux[key];
        }
        console.log(`  📋 ${JSON.stringify(otherData, null, 2)}`);
      }
    }
  };
};
