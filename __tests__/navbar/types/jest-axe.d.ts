/**
 * Type declarations for jest-axe
 * Since @types/jest-axe doesn't exist, we declare the types we need
 */

declare module "jest-axe" {
  import { AxeResults } from "axe-core"

  export function axe(element: Element | Document, options?: any): Promise<AxeResults>

  export const toHaveNoViolations: jest.ExpectExtendMap

  export function configureAxe(options?: any): typeof axe
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R
    }
  }
}
