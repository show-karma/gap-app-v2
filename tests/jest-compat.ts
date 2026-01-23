/**
 * Jest Compatibility Layer for Bun
 *
 * This file provides Jest-compatible APIs on top of Bun's native testing utilities.
 * It is loaded as a preload script before test files.
 *
 * IMPORTANT MIGRATION NOTE:
 * ========================
 * Bun auto-injects its own `jest` global for test files that use describe/it/expect
 * without explicitly importing from 'bun:test'. This auto-injection happens AFTER
 * preload scripts run but BEFORE test file code executes.
 *
 * To ensure jest.mock() works at module level, test files must:
 * 1. Import from 'bun:test' at the TOP of the file (before any jest.mock calls)
 *
 * CORRECT:
 * ```typescript
 * import { describe, expect, test } from "bun:test";
 * jest.mock("./myModule");  // Works - our jest global is preserved
 * ```
 *
 * INCORRECT:
 * ```typescript
 * jest.mock("./myModule");  // Fails - Bun's auto-injected jest doesn't support this
 * // describe(...) without import triggers auto-injection
 * ```
 *
 * Tests that don't use module-level jest.mock() work without changes.
 */

import { Mock, mock, spyOn } from "bun:test";

// Track mocked modules for later reference
const mockedModules = new Map<string, unknown>();

// Track all created mocks for clearAllMocks/resetAllMocks
const allMocks: Set<JestMockFn> = new Set();

// Pre-registered mock functions that can be accessed by tests
// This solves the hoisting issue - mocks are registered before imports
const preRegisteredMocks = new Map<string, JestMockFn>();

/**
 * Get a pre-registered mock function for a module
 * Tests use this to configure mocks that were registered in bun-setup.ts
 */
function getMock(modulePath: string): JestMockFn | undefined {
  return preRegisteredMocks.get(modulePath);
}

/**
 * Register a mock function for a module path
 * Called from bun-setup.ts to pre-register mocks before tests run
 */
function registerMock(modulePath: string, mockFn: JestMockFn): void {
  preRegisteredMocks.set(modulePath, mockFn);
}

// Timer state
let fakeTimersEnabled = false;
let currentTime = Date.now();
const pendingTimers: Array<{ callback: () => void; time: number; id: number }> = [];
let timerIdCounter = 0;

// Store the original Date constructor for restoration
const RealDate = Date;

interface MockCall {
  args: unknown[];
  result: unknown;
  error?: unknown;
}

interface JestMockFn {
  (...args: unknown[]): unknown;
  mock: {
    calls: unknown[][];
    results: Array<{ type: "return" | "throw"; value: unknown }>;
    instances: unknown[];
    lastCall?: unknown[];
  };
  _isMockFunction: true;
  _implementation: ((...args: unknown[]) => unknown) | null;
  _returnValue: unknown;
  _returnValueOnce: unknown[];
  _resolvedValue: unknown;
  _resolvedValueOnce: unknown[];
  _rejectedValue: unknown;
  _rejectedValueOnce: unknown[];
  _implementationOnce: Array<(...args: unknown[]) => unknown>;
  mockImplementation: (fn: (...args: unknown[]) => unknown) => JestMockFn;
  mockImplementationOnce: (fn: (...args: unknown[]) => unknown) => JestMockFn;
  mockReturnValue: (value: unknown) => JestMockFn;
  mockReturnValueOnce: (value: unknown) => JestMockFn;
  mockResolvedValue: (value: unknown) => JestMockFn;
  mockResolvedValueOnce: (value: unknown) => JestMockFn;
  mockRejectedValue: (error: unknown) => JestMockFn;
  mockRejectedValueOnce: (error: unknown) => JestMockFn;
  mockClear: () => JestMockFn;
  mockReset: () => JestMockFn;
  mockRestore: () => void;
  getMockName: () => string;
  mockName: (name: string) => JestMockFn;
  mockReturnThis: () => JestMockFn;
}

/**
 * Create a mock function compatible with Jest's jest.fn()
 * Uses Bun's native mock() function which is already compatible with expect matchers
 */
function createMockFn(implementation?: (...args: unknown[]) => unknown): JestMockFn {
  // Use Bun's native mock function - this ensures compatibility with expect matchers
  const bunMock = mock(implementation || (() => undefined));

  // Cast to JestMockFn - Bun's mock already has all the required methods
  const mockFn = bunMock as unknown as JestMockFn;

  // Add Jest-specific properties that might be missing
  mockFn._isMockFunction = true;
  mockFn._implementation = implementation || null;
  mockFn._returnValue = undefined;
  mockFn._returnValueOnce = [];
  mockFn._resolvedValue = undefined;
  mockFn._resolvedValueOnce = [];
  mockFn._rejectedValue = undefined;
  mockFn._rejectedValueOnce = [];
  mockFn._implementationOnce = [];

  // Track for global operations
  allMocks.add(mockFn);

  return mockFn;
}

/**
 * Create an auto-mock for a module (when jest.mock() is called without a factory)
 * This creates a mock object with jest.fn() for all exported functions
 * The default export is also a Proxy that auto-creates mock functions for any property access
 */
function createAutoMock(moduleName: string): Record<string, unknown> {
  // Create a base mock function that also acts as an object with mock methods
  const baseMockFn = createMockFn();

  // Create a default export that is both a function AND an object with auto-mock properties
  // This handles cases like mixpanel-browser that export objects with methods
  const defaultExportProxy = new Proxy(baseMockFn, {
    get(target: any, prop) {
      // Return existing properties on the mock function
      if (prop in target) {
        return target[prop];
      }
      // For symbol properties, return undefined to avoid proxy issues
      if (typeof prop === "symbol") {
        return undefined;
      }
      // Auto-create a mock function for any property that doesn't exist
      const newMock = createMockFn();
      target[prop] = newMock;
      return newMock;
    },
  });

  const autoMock: Record<string, unknown> = {
    default: defaultExportProxy,
    __esModule: true,
  };

  // Return a proxy that auto-creates mocks for any accessed named export
  return new Proxy(autoMock, {
    get(target, prop) {
      if (prop in target) {
        return target[prop as string];
      }
      // For symbol properties, return undefined
      if (typeof prop === "symbol") {
        return undefined;
      }
      // Auto-create a mock function for any property that doesn't exist
      const newMock = createMockFn();
      target[prop as string] = newMock;
      return newMock;
    },
  });
}

/**
 * Jest-compatible mock module function
 * This intercepts jest.mock() calls and converts them to Bun's mock.module()
 */
function jestMock(moduleName: string, factory?: () => unknown) {
  try {
    if (factory) {
      const moduleExports = factory();
      mock.module(moduleName, () => moduleExports);
      mockedModules.set(moduleName, moduleExports);
    } else {
      // When called without a factory, create an auto-mock
      const autoMock = createAutoMock(moduleName);
      mock.module(moduleName, () => autoMock);
      mockedModules.set(moduleName, autoMock);
    }
  } catch (error) {
    console.warn(`[jest-compat] Failed to mock module "${moduleName}":`, error);
  }
}

/**
 * Timer management functions
 */
function useFakeTimers(config?: { now?: number | Date; advanceTimers?: boolean }) {
  fakeTimersEnabled = true;
  if (config?.now) {
    currentTime = typeof config.now === "number" ? config.now : config.now.getTime();
  }
  pendingTimers.length = 0;

  // Override global timer functions
  const originalSetTimeout = globalThis.setTimeout;
  const originalSetInterval = globalThis.setInterval;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalClearInterval = globalThis.clearInterval;

  (globalThis as any)._originalSetTimeout = originalSetTimeout;
  (globalThis as any)._originalSetInterval = originalSetInterval;
  (globalThis as any)._originalClearTimeout = originalClearTimeout;
  (globalThis as any)._originalClearInterval = originalClearInterval;

  (globalThis as any).setTimeout = (callback: () => void, ms: number = 0) => {
    const id = ++timerIdCounter;
    pendingTimers.push({ callback, time: currentTime + ms, id });
    pendingTimers.sort((a, b) => a.time - b.time);
    return id;
  };

  (globalThis as any).setInterval = (callback: () => void, ms: number = 0) => {
    const id = ++timerIdCounter;
    const intervalCallback = () => {
      callback();
      if (fakeTimersEnabled) {
        pendingTimers.push({ callback: intervalCallback, time: currentTime + ms, id });
        pendingTimers.sort((a, b) => a.time - b.time);
      }
    };
    pendingTimers.push({ callback: intervalCallback, time: currentTime + ms, id });
    pendingTimers.sort((a, b) => a.time - b.time);
    return id;
  };

  (globalThis as any).clearTimeout = (id: number) => {
    const index = pendingTimers.findIndex((t) => t.id === id);
    if (index !== -1) {
      pendingTimers.splice(index, 1);
    }
  };

  (globalThis as any).clearInterval = (id: number) => {
    const index = pendingTimers.findIndex((t) => t.id === id);
    if (index !== -1) {
      pendingTimers.splice(index, 1);
    }
  };

  // Override Date constructor to return mocked time
  const MockDate = class extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(currentTime);
      } else {
        // @ts-expect-error - spread args to constructor
        super(...args);
      }
    }
    static now() {
      return currentTime;
    }
    static parse(s: string) {
      return RealDate.parse(s);
    }
    static UTC(...args: Parameters<typeof Date.UTC>) {
      return RealDate.UTC(...args);
    }
  } as DateConstructor;

  // Preserve static properties
  Object.defineProperty(MockDate, "name", { value: "Date" });

  (globalThis as any).Date = MockDate;

  return jestCompat;
}

function useRealTimers() {
  fakeTimersEnabled = false;
  if ((globalThis as any)._originalSetTimeout) {
    globalThis.setTimeout = (globalThis as any)._originalSetTimeout;
    globalThis.setInterval = (globalThis as any)._originalSetInterval;
    globalThis.clearTimeout = (globalThis as any)._originalClearTimeout;
    globalThis.clearInterval = (globalThis as any)._originalClearInterval;
  }
  // Restore the original Date constructor
  (globalThis as any).Date = RealDate;
  return jestCompat;
}

function advanceTimersByTime(ms: number) {
  const targetTime = currentTime + ms;
  while (pendingTimers.length > 0 && pendingTimers[0].time <= targetTime) {
    const timer = pendingTimers.shift()!;
    currentTime = timer.time;
    timer.callback();
  }
  currentTime = targetTime;
}

async function advanceTimersByTimeAsync(ms: number) {
  advanceTimersByTime(ms);
  // Allow microtasks to run
  await Promise.resolve();
}

function runAllTimers() {
  const maxIterations = 100000;
  let iterations = 0;
  while (pendingTimers.length > 0 && iterations < maxIterations) {
    const timer = pendingTimers.shift()!;
    currentTime = timer.time;
    timer.callback();
    iterations++;
  }
}

async function runAllTimersAsync() {
  runAllTimers();
  await Promise.resolve();
}

function runOnlyPendingTimers() {
  const currentPendingCount = pendingTimers.length;
  for (let i = 0; i < currentPendingCount && pendingTimers.length > 0; i++) {
    const timer = pendingTimers.shift()!;
    currentTime = timer.time;
    timer.callback();
  }
}

function advanceTimersToNextTimer(steps = 1) {
  for (let i = 0; i < steps && pendingTimers.length > 0; i++) {
    const timer = pendingTimers.shift()!;
    currentTime = timer.time;
    timer.callback();
  }
}

async function advanceTimersToNextTimerAsync(steps = 1) {
  advanceTimersToNextTimer(steps);
  await Promise.resolve();
}

function clearAllTimers() {
  pendingTimers.length = 0;
}

function getTimerCount() {
  return pendingTimers.length;
}

function setSystemTime(now: number | Date) {
  currentTime = typeof now === "number" ? now : now.getTime();
}

function getRealSystemTime() {
  return Date.now();
}

function now() {
  return fakeTimersEnabled ? currentTime : Date.now();
}

/**
 * Jest compatibility object
 * Provides the same API as Jest's global jest object
 */
const jestCompat = {
  // Mock functions
  fn: createMockFn,
  spyOn: spyOn,

  // Module mocking
  mock: jestMock,
  unmock: (moduleName: string) => {
    mockedModules.delete(moduleName);
  },
  doMock: jestMock,
  dontMock: (moduleName: string) => {
    mockedModules.delete(moduleName);
  },
  resetModules: () => {
    mockedModules.clear();
  },
  isolateModules: (fn: () => void) => {
    fn();
  },

  // Mock management
  clearAllMocks: () => {
    for (const mockFn of allMocks) {
      mockFn.mockClear();
    }
  },
  resetAllMocks: () => {
    for (const mockFn of allMocks) {
      mockFn.mockReset();
    }
  },
  restoreAllMocks: () => {
    for (const mockFn of allMocks) {
      mockFn.mockRestore();
    }
  },

  // Timers - Full implementation
  useFakeTimers,
  useRealTimers,
  runAllTimers,
  runAllTimersAsync,
  runOnlyPendingTimers,
  advanceTimersByTime,
  advanceTimersByTimeAsync,
  advanceTimersToNextTimer,
  advanceTimersToNextTimerAsync,
  clearAllTimers,
  getTimerCount,
  setSystemTime,
  getRealSystemTime,
  now,

  // Configuration
  setTimeout: (timeout: number) => {
    // Jest setTimeout is typically used to set test timeout
    // In Bun, this is handled differently
  },
  retryTimes: (numRetries: number, options?: { logErrorsBeforeRetry?: boolean }) => {
    // Bun doesn't support retry natively
  },

  // Mocked modules access
  mocked: <T>(item: T): T => item,
  isMockFunction: (fn: unknown): fn is JestMockFn => {
    return typeof fn === "function" && (fn as JestMockFn)._isMockFunction === true;
  },

  // Require utilities
  requireActual: async (moduleName: string) => {
    // Try to get the actual module
    try {
      return await import(moduleName);
    } catch {
      return {};
    }
  },
  requireMock: (moduleName: string) => {
    return mockedModules.get(moduleName) || {};
  },

  // Additional Jest methods
  genMockFromModule: (moduleName: string) => createAutoMock(moduleName),
  setMock: (moduleName: string, moduleExports: unknown) => {
    mock.module(moduleName, () => moduleExports);
    mockedModules.set(moduleName, moduleExports);
  },

  // Get pre-registered mock - use this to access mocks registered in bun-setup.ts
  getMock,
};

// Make jest available globally
(global as any).jest = jestCompat;
(globalThis as any).jest = jestCompat;

// Export for potential direct imports
export { jestCompat as jest, createMockFn, getMock, registerMock, preRegisteredMocks };
