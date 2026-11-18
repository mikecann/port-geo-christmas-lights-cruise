import mikecannLint, { tseslint } from "mikecann-lint";
import js from "@eslint/js";
import globals from "globals";
import reactRefresh from "eslint-plugin-react-refresh";
import localPlugin from "./eslint-plugin-local/index.js";

export default [
  // React Compiler rules, Convex rules and the state machine guardrails
  // (with the convex/machines.ts catalog and test-file exemptions).
  // scripts/ and worker/ sit outside the tsconfigs; work/ is local scratch.
  ...(await mikecannLint({
    root: import.meta.dirname,
    untyped: ["scripts/**", "worker/**"],
    ignores: ["work/**"],
  })),
  {
    ignores: [
      "dist",
      "convex/_generated",
      "node_modules",
      "blueprint-templates",
      "eslint-plugin-local",
      "*.config.js",
      "*.config.ts",
      "*.config.mts",
      "*.config.cjs",
      "coverage",
      ".vite",
      ".convex",
      "build",
      "e2e",
    ],
  },
  js.configs.recommended,
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-refresh": reactRefresh,
      local: localPlugin,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-empty-pattern": "off",
      curly: ["error", "multi"],
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "prefer-const": ["error", { destructuring: "all" }],
      "no-var": "error",
      "no-negated-condition": "warn",
      "no-extra-boolean-cast": "error",
      "no-unneeded-ternary": "error",

      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/consistent-type-imports": "off",

      "no-restricted-syntax": [
        "error",
        {
          selector: "SwitchStatement",
          message:
            "Switch statements are not allowed. Use if-else with early returns instead.",
        },
        {
          selector:
            "CallExpression[callee.object.name='convex'][callee.property.name='mutation']",
          message:
            "Build mutations from `mutation` in convex/features/common/lib.ts so the vote aggregate triggers run.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/_generated/server"],
              importNames: ["mutation", "internalMutation"],
              message:
                "Build mutations from `mutation` in convex/features/common/lib.ts so the vote aggregate triggers run.",
            },
          ],
        },
      ],

      // Custom local rules
      "local/no-hoisted-single-use-handlers": "warn",
    },
  },
  // Test helpers put rows straight into a state to set up a case, and
  // convex-test's own helpers reach the internal brand on purpose
  {
    files: ["convex/features/common/tests/**"],
    rules: {
      "machines/no-direct-state-writes": "off",
      "machines/no-brand-bypass": "off",
      "machines/no-optional-on-machine-tables": "off",
    },
  },
  // Apply max-lines-per-function only to React component files (.tsx)
  {
    files: ["**/*.tsx"],
    ignores: ["**/Houses.tsx"],
    rules: {
      "max-lines-per-function": [
        "warn",
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
    },
  },
];
