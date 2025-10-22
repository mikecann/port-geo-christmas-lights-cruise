import { Stagehand } from "@browserbasehq/stagehand";
import { routes } from "../src/routes";
import { beforeAll, afterAll, beforeEach } from "vitest";
import { api } from "../convex/_generated/api";
import { Route } from "type-route";
import { ConvexBackend } from "./lib/ConvexBackend";
import { ViteFrontend } from "./lib/ViteFrontend";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

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
      signInAs: (options: AuthenticateOptions) => {
        return authenticateTestUser(stagehand, frontend.frontendUrl!, options);
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
 * Helper to authenticate a test user in E2E tests using Stagehand.
 * Uses the testing-only ConvexCredentials provider via the /test-auth page.
 *
 * @param stagehand - The Stagehand instance
 * @param frontendUrl - The base URL of the frontend
 * @param options - User details for authentication
 * @returns Promise that resolves when authentication is complete
 */
export async function authenticateTestUser(
  stagehand: Stagehand,
  frontendUrl: string,
  options: AuthenticateOptions,
): Promise<void> {
  // Navigate to the test auth page
  await stagehand.page.goto(`${frontendUrl}${routes.testAuth().href}`);

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
    const nameInput = await stagehand.page.$('[data-testid="test-auth-name"]');
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
  await stagehand.page.waitForSelector('[data-testid="test-auth-status"]');
}

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
