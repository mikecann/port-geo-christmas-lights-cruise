import { Stagehand } from "@browserbasehq/stagehand";
import { routes } from "../src/routes";
import { beforeAll, afterAll, beforeEach } from "vitest";
import { api } from "../convex/_generated/api";
import { Route } from "type-route";
import { ConvexBackend } from "./lib/ConvexBackend";
import { ViteFrontend } from "./lib/ViteFrontend";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

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

export const logExpenseEstimate = (stagehand: Stagehand) => {
  console.log("--- run finished ---");
  console.log({
    totalPromptTokens: stagehand.metrics.totalPromptTokens,
    totalCompletionTokens: stagehand.metrics.totalCompletionTokens,
  });
  console.log(
    `Estimated cost: $${(stagehand.metrics.totalPromptTokens * 0.00000025 + stagehand.metrics.totalCompletionTokens * 0.000002).toFixed(5)}`,
  );
};

export const setupE2E = () => {
  const backend = new ConvexBackend({
    projectDir: process.cwd(),
    stdio: "ignore",
  });
  const frontend = new ViteFrontend();

  const stagehand = new Stagehand({
    env: "LOCAL",
    modelName: "openai/gpt-5-mini",
    localBrowserLaunchOptions: {
      headless: Boolean(process.env.CI),
    },
    domSettleTimeoutMs: 60000,
    verbose: 2,
    logger: createDetailedStagehandLogger(),
  });

  beforeAll(async () => {
    await backend.init();

    const authKeys = await generateTestKeys();
    await backend.setEnv("JWT_PRIVATE_KEY", authKeys.JWT_PRIVATE_KEY);
    await backend.setEnv("JWKS", authKeys.JWKS);

    await frontend.init({ convexUrl: backend.backendUrl! });
    await stagehand.init();
  });

  afterAll(async () => {
    await frontend.stop();
    await backend.stop();
    await stagehand.close();
    logExpenseEstimate(stagehand);
  });

  beforeEach(async () => {
    await backend.client.mutation(api.testing.testing.clearAll);
  });

  return {
    backend,
    frontend,
    stagehand,
    auth: {
      signInAs: async (options: AuthenticateOptions) => {
        // Navigate to the test auth page
        await stagehand.page.goto(
          `${frontend.frontendUrl}${routes.testAuth().href}`,
        );

        // Fill in the email
        if (options.email) {
          const emailInput = await stagehand.page.$(
            '[data-testid="test-auth-email"]',
          );
          if (emailInput) {
            await emailInput.fill(options.email);
          }
        }

        // Fill in the name
        if (options.name) {
          const nameInput = await stagehand.page.$(
            '[data-testid="test-auth-name"]',
          );
          if (nameInput) {
            await nameInput.fill(options.name);
          }
        }

        // Set system admin checkbox
        if (options.isSystemAdmin) {
          const checkbox = await stagehand.page.$(
            '[data-testid="test-auth-system-admin"]',
          );
          if (checkbox) {
            await checkbox.check();
          }
        }

        // Set competition admin checkbox
        if (options.isCompetitionAdmin) {
          const checkbox = await stagehand.page.$(
            '[data-testid="test-auth-competition-admin"]',
          );
          if (checkbox) {
            await checkbox.check();
          }
        }

        // Click the authenticate button
        const submitButton = await stagehand.page.$(
          '[data-testid="test-auth-submit"]',
        );
        if (submitButton) {
          await submitButton.click();
        }

        // Wait for authentication to complete
        await stagehand.page.waitForFunction(
          () => {
            const statusElement = document.querySelector(
              '[data-testid="test-auth-status"]',
            );
            return statusElement?.textContent === "Authenticated!";
          },
          { timeout: 10000 },
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
      if (!route) return stagehand.page.goto(frontend.frontendUrl!);
      return stagehand.page.goto(`${frontend.frontendUrl}${route.href}`);
    },
  };
};

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
