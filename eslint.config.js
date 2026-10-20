import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import localPlugin from "./eslint-plugin-local/index.js";
import machines from "@convex-dev/state-machines/eslint";

export default [
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
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      local: localPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
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
  // The state machine package's guardrails: nothing writes a machine's state
  // round it, and every disable says why. With type information they read
  // the app's DataModel to find the machines' tables.
  {
    files: ["convex/**/*.ts"],
    ignores: ["convex/_generated/**"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    ...machines.configs.recommended,
  },
  // The catalog registers the delivery that timers fire through
  {
    files: ["convex/machines.ts"],
    rules: { "machines/no-brand-bypass": ["error", { deliver: false }] },
  },
  // Tests and their helpers put rows straight into a state to set up a case,
  // and convex-test's own helpers reach the internal brand on purpose
  {
    files: ["convex/**/*.test.ts", "convex/features/common/tests/**"],
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
