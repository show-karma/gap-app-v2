/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";
import nextJest from "next/jest.js";

const config: Config = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  // DISABLED by default - use --coverage flag to enable
  collectCoverage: false,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // Coverage reporters - include json-summary for GitHub Actions
  coverageReporters: ["json", "json-summary", "lcov", "text", "clover"],

  moduleDirectories: ["node_modules", "<rootDir>"],

  // The test environment that will be used for testing
  testEnvironment: "jest-environment-jsdom",

  // Use custom resolver for MSW modules to handle pnpm structure
  resolver: "<rootDir>/jest-resolver.js",

  moduleNameMapper: {
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/contexts/(.*)$": "<rootDir>/contexts/$1",
    "^@/features/(.*)$": "<rootDir>/src/features/$1",
    "^@/hooks/useZeroDevSigner$": "<rootDir>/__mocks__/hooks/useZeroDevSigner.ts",
    "^@/hooks/useSetupChainAndWallet$": "<rootDir>/__mocks__/hooks/useSetupChainAndWallet.ts",
    "^@/hooks/(.*)$": "<rootDir>/hooks/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/store$": "<rootDir>/store/index.ts",
    "^@/store/(.*)$": "<rootDir>/store/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
    "^@/utilities/gasless$": "<rootDir>/__mocks__/utilities/gasless/index.ts",
    "^@/utilities/gasless/(.*)$": "<rootDir>/__mocks__/utilities/gasless/index.ts",
    "^utilities/gasless$": "<rootDir>/__mocks__/utilities/gasless/index.ts",
    "^utilities/gasless/(.*)$": "<rootDir>/__mocks__/utilities/gasless/index.ts",
    "^@/utilities/(.*)$": "<rootDir>/utilities/$1",
    "^@/constants/(.*)$": "<rootDir>/constants/$1",
    "^@/services/(.*)$": "<rootDir>/services/$1",
    "^@/src/(.*)$": "<rootDir>/src/$1",
    "^@/__tests__/(.*)$": "<rootDir>/__tests__/$1",
    "^react-markdown$": "<rootDir>/__mocks__/react-markdown.tsx",
    "^unist-util-visit$": "<rootDir>/__mocks__/unist-util-visit.ts",
    "^until-async$": "<rootDir>/__mocks__/until-async.js",
    "^multiformats/cid$": "<rootDir>/__mocks__/multiformats.ts",
    "^@aa-sdk/core$": "<rootDir>/__mocks__/@aa-sdk/core.ts",
    "^@privy-io/wagmi$": "<rootDir>/__mocks__/@privy-io/wagmi.ts",
    "^@account-kit/infra$": "<rootDir>/__mocks__/@account-kit/infra.ts",
    "^@account-kit/infra/(.*)$": "<rootDir>/__mocks__/@account-kit/infra.ts",
    "^@account-kit/smart-contracts$": "<rootDir>/__mocks__/@account-kit/smart-contracts.ts",
    "^@account-kit/smart-contracts/(.*)$": "<rootDir>/__mocks__/@account-kit/smart-contracts.ts",
  },

  // Transform ESM modules that need to be compiled for Jest
  // Include MSW and all its dependencies (including nested pnpm packages)
  transformIgnorePatterns: [
    "/node_modules/(?!(@show-karma|@ethereum-attestation-service|multiformats|wagmi|@wagmi|@wagmi/core|@wagmi/connectors|viem|@privy-io|@coinbase|rehype-sanitize|hast-util-sanitize|msw|@mswjs|until-async|rehype-external-links|@noble|@aa-sdk)/)",
  ],

  globalSetup: "./tests/global.js",
  setupFilesAfterEnv: ["./tests/setup.js", "./__tests__/navbar/setup.ts"],
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],

  // Reduce memory usage
  maxWorkers: "50%",

  // Coverage thresholds - enforced for production builds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Create the async config function and ensure transformIgnorePatterns are preserved
// next/jest may override transformIgnorePatterns, so we need to merge them manually
export default async () => {
  const jestConfig = await createJestConfig(config)();
  return {
    ...jestConfig,
    // Override transformIgnorePatterns to ensure ESM modules are transformed
    transformIgnorePatterns: [
      "/node_modules/(?!(@show-karma|@ethereum-attestation-service|multiformats|wagmi|@wagmi|@wagmi/core|@wagmi/connectors|viem|@privy-io|@coinbase|rehype-sanitize|hast-util-sanitize|msw|@mswjs|until-async|rehype-external-links|@noble|@aa-sdk)/)",
    ],
  };
};
