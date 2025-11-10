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
    "^@/hooks/(.*)$": "<rootDir>/hooks/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/store$": "<rootDir>/store/index.ts",
    "^@/store/(.*)$": "<rootDir>/store/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
    "^@/utilities/(.*)$": "<rootDir>/utilities/$1",
    "^@/constants/(.*)$": "<rootDir>/constants/$1",
    "^@/services/(.*)$": "<rootDir>/services/$1",
    "^@/src/(.*)$": "<rootDir>/src/$1",
    "^@/__tests__/(.*)$": "<rootDir>/__tests__/$1",
    "^until-async$": "<rootDir>/__mocks__/until-async.js",
  },

  // Transform ESM modules that need to be compiled for Jest
  // Include MSW and all its dependencies (including nested pnpm packages)
  transformIgnorePatterns: [
    "/node_modules/(?!(@show-karma|wagmi|@wagmi|@wagmi/core|@wagmi/connectors|viem|@privy-io|@coinbase|rehype-sanitize|hast-util-sanitize|msw|@mswjs|until-async|rehype-external-links|@noble)/)",
  ],

  globalSetup: "./tests/global.js",
  setupFilesAfterEnv: ["./tests/setup.js"],
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
const jestConfig = createJestConfig(config);

export default jestConfig;
