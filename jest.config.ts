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

  moduleDirectories: ["node_modules", "<rootDir>"],

  // The test environment that will be used for testing
  testEnvironment: "jest-environment-jsdom",

  moduleNameMapper: {
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/contexts/(.*)$": "<rootDir>/contexts/$1",
    "^@/hooks/(.*)$": "<rootDir>/hooks/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/store/(.*)$": "<rootDir>/store/$1",
    "^@/types/(.*)$": "<rootDir>/types/$1",
    "^@/utilities/(.*)$": "<rootDir>/utilities/$1",
    "^@/constants/(.*)$": "<rootDir>/constants/$1",
    "^@/services/(.*)$": "<rootDir>/services/$1",
    "^@/src/(.*)$": "<rootDir>/src/$1",
  },

  // Transform ESM modules that need to be compiled for Jest
  transformIgnorePatterns: [
    "/node_modules/(?!(@show-karma|wagmi|@wagmi|viem|@privy-io|rehype-sanitize|hast-util-sanitize|msw|rehype-external-links)/)",
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

export default createJestConfig(config);
