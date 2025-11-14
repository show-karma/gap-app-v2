/// <reference types="cypress" />
/// <reference types="cypress-image-snapshot" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Takes a snapshot of the current viewport and compares it to a baseline image.
     * If the baseline doesn't exist, it will be created.
     * @param name - Name of the snapshot (used as filename)
     * @param options - Optional configuration for the snapshot comparison
     */
    matchImageSnapshot(
      name: string,
      options?: {
        threshold?: number;
        failureThreshold?: number;
        failureThresholdType?: "pixel" | "percent";
        customDiffConfig?: Record<string, unknown>;
        customSnapshotsDir?: string;
        customDiffDir?: string;
        timeout?: number;
      }
    ): Chainable<void>;
  }
}

