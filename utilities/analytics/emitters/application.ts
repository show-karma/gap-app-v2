/**
 * Funding-application analytics emitters.
 */

import { track } from "@/utilities/analytics/client";

/**
 * An admin moving an application between states.
 *
 * Emitted from the service rather than from a hook: four screens drive that one
 * call, and instrumenting each of their mutations would drift apart. The reason
 * text is deliberately not reported — it is free-form admin prose.
 */
export function emitApplicationStatusChanged(applicationId: string, status: string): void {
  track("application_status_changed", { application_id: applicationId, to: status });
}
