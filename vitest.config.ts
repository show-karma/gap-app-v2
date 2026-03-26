import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

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
    find: /^@\/utilities\/gasless(\/.*)?$/,
    replacement: `${dirname}/__mocks__/utilities/gasless/index.ts`,
  },
  { find: /^until-async$/, replacement: `${dirname}/__mocks__/until-async.js` },
  { find: /^multiformats\/cid$/, replacement: `${dirname}/__mocks__/multiformats.ts` },
  { find: /^@aa-sdk\/core$/, replacement: `${dirname}/__mocks__/@aa-sdk/core.ts` },
  { find: /^@privy-io\/wagmi$/, replacement: `${dirname}/__mocks__/@privy-io/wagmi.ts` },
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
          pool: "forks",
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
      // Storybook test project
      {
        extends: true,
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
    ],
  },
});
