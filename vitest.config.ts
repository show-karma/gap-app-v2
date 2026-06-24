// Set TZ before any imports so that worker threads created by vitest's thread
// pool inherit UTC from the parent process environment at startup.  Without
// this, date-fns' format() resolves the local OS timezone (V8 caches the ICU
// timezone at thread creation time, so process.env.TZ mutations inside setup
// files are a no-op for threads).
process.env.TZ = "UTC";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// The Storybook browser-test project is opt-in (set VITEST_STORYBOOK=true).
// It is never invoked by CI or any package script — everything runs
// `vitest --project unit` — yet defining it unconditionally makes vitest
// evaluate `storybookTest()` on every run, which loads `.storybook/main.ts`
// and resolves its `@storybook/nextjs` webpack5 builder. That builder isn't
// installed (addon-vitest expects a Vite framework), so the preset load
// throws ERR_MODULE_NOT_FOUND. It's a no-op warning on most runs but can be
// fatal on a constrained CI worker, failing the unit shard that happened to
// load it first. Gating the project off by default removes that coupling
// without touching the unit suite or the Storybook dev/build commands.
const ENABLE_STORYBOOK_PROJECT = process.env.VITEST_STORYBOOK === "true";

// Shared tsconfig path aliases (mirrors tsconfig.json "paths")
const tsconfigAliases = [
  { find: /^@\/features\/(.*)$/, replacement: `${dirname}/src/features/$1` },
  { find: /^@\/src\/(.*)$/, replacement: `${dirname}/src/$1` },
  { find: /^@\/(.*)$/, replacement: `${dirname}/$1` },
];

// Aliases that redirect ESM-only modules to mock implementations for unit tests
const unitTestMockAliases = [
  {
    find: /^@\/hooks\/useZeroDevSigner$/,
    replacement: `${dirname}/__mocks__/hooks/useZeroDevSigner.ts`,
  },
  {
    find: /^@\/hooks\/useSetupChainAndWallet$/,
    replacement: `${dirname}/__mocks__/hooks/useSetupChainAndWallet.ts`,
  },
  {
    find: /^@\/utilities\/gasless$/,
    replacement: `${dirname}/__mocks__/utilities/gasless/index.ts`,
  },
  { find: /^until-async$/, replacement: `${dirname}/__mocks__/until-async.js` },
  { find: /^multiformats\/cid$/, replacement: `${dirname}/__mocks__/multiformats.ts` },
  { find: /^@aa-sdk\/core$/, replacement: `${dirname}/__mocks__/@aa-sdk/core.ts` },
  { find: /^@privy-io\/wagmi$/, replacement: `${dirname}/__mocks__/@privy-io/wagmi.ts` },
  { find: /^@sentry\/nextjs$/, replacement: `${dirname}/__mocks__/@sentry/nextjs.ts` },
  {
    find: /^@account-kit\/infra(\/.*)?$/,
    replacement: `${dirname}/__mocks__/@account-kit/infra.ts`,
  },
  {
    find: /^@account-kit\/smart-contracts(\/.*)?$/,
    replacement: `${dirname}/__mocks__/@account-kit/smart-contracts.ts`,
  },
];

export default defineConfig({
  plugins: [react(), tsconfigPaths({ root: dirname })],
  resolve: {
    alias: tsconfigAliases,
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "lcov"],
      thresholds: { branches: 60, functions: 60, lines: 70, statements: 70 },
    },
    projects: [
      // Unit and integration test project
      {
        extends: true,
        resolve: {
          // Mock aliases must come before tsconfig aliases (first match wins)
          alias: [...unitTestMockAliases, ...tsconfigAliases],
        },
        test: {
          name: "unit",
          environment: "jsdom",
          globals: true,
          pool: "threads",
          isolate: true,
          // Ensure TZ is set at thread startup (threads inherit the parent process
          // env, so process.env.TZ in setup.ts was a no-op for V8's tz resolution)
          env: { TZ: "UTC" },
          setupFiles: ["./__tests__/setup.ts", "./__tests__/setup-mocks.ts"],
          include: ["**/*.{test,spec}.{ts,tsx}"],
          exclude: [
            "**/node_modules/**",
            "**/e2e/**",
            "**/.next/**",
            "**/.storybook/**",
            "**/cypress/**",
            "**/*.stories.*",
          ],
        },
      },
      // Storybook test project (opt-in via VITEST_STORYBOOK=true — see note above)
      ...(ENABLE_STORYBOOK_PROJECT
        ? [
            {
              extends: true as const,
              plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
              test: {
                name: "storybook",
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright({}),
                  instances: [{ browser: "chromium" }],
                },
                setupFiles: [".storybook/vitest.setup.ts"],
              },
            },
          ]
        : []),
    ],
  },
});
