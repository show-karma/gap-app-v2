import { NewGrantPageClient } from "./NewGrantPageClient";

/**
 * New Grant Page (V2)
 *
 * Displays the form to add a new grant/funding to the project.
 * Uses the profile layout context for consistent navigation.
 * Metadata (including robots noindex) is set by the parent layout.
 */
export default function NewGrantPage() {
  return <NewGrantPageClient />;
}
