/**
 * Type declarations for jest-axe (compatible with both Jest and Vitest)
 */

declare module "jest-axe" {
  import type { AxeResults } from "axe-core";

  export function axe(
    element: Element | Document,
    options?: Record<string, unknown>
  ): Promise<AxeResults>;

  export const toHaveNoViolations: Record<string, unknown>;

  export function configureAxe(options?: Record<string, unknown>): typeof axe;
}

interface CustomMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module "vitest" {
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
