import type { ReactNode } from "react";
import { NonTranslatableRegion } from "./components/NonTranslatableRegion";

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout for individual application pages.
 * Provides the community-scoped context for application detail/edit pages.
 *
 * The view subtree is wrapped in {@link NonTranslatableRegion}, which marks it
 * `translate="no"` so machine translation does not rewrite the React-owned text
 * nodes in the streamed content. That rewrite is the dominant trigger of the
 * React 19 stream-resume ($RS) `parentNode`-null crash (GAP-FRONTEND-212), which
 * is thrown outside React's render/commit phases and therefore cannot be caught
 * by an error boundary — so we remove the trigger at the source instead.
 */
export default function ApplicationLayout({ children }: LayoutProps) {
  return <NonTranslatableRegion>{children}</NonTranslatableRegion>;
}
