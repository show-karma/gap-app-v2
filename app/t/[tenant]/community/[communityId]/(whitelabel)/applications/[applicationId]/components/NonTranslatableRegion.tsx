import type { ReactNode } from "react";

interface NonTranslatableRegionProps {
  children: ReactNode;
}

/**
 * Non-translatable region wrapper for the streamed application view subtree.
 *
 * GAP-FRONTEND-212 is a React 19 stream/Suspense-resume ($RS) crash —
 * "Cannot read properties of null (reading 'parentNode')" — reported with
 * `mechanism: onerror, handled: no`. That error is thrown from React's injected
 * streaming-splice <script> at global scope, OUTSIDE React's render/commit/
 * lifecycle phases, so it reaches `window.onerror` directly. A React error
 * boundary cannot catch it: boundaries only catch errors thrown during render,
 * lifecycle, and constructors of the subtree below them, not errors thrown by
 * the inline $RS script or by external DOM mutation between commits.
 *
 * The actual fix is therefore at the source of the dominant trigger, not after
 * the fact: Google Translate / in-browser translate rewrites the React-owned
 * text nodes in the streamed content, which desynchronizes the DOM that $RS
 * later tries to splice. Marking the subtree `translate="no"` (+ `notranslate`)
 * tells machine translation to leave these nodes alone, removing the trigger.
 * This mirrors the standard Google-Translate-vs-React guidance.
 *
 * Residual occurrences from other external mutators (aggressive extensions) are
 * environmental and not actionable; they are filtered in
 * `utilities/sentry/ignoreErrors.ts`
 * alongside the existing "node to be removed is not a child of this node." entry.
 *
 * Genuine render-phase errors in this subtree are still handled by the
 * route-level `error.tsx` boundary, which Next.js wires up automatically.
 */
export function NonTranslatableRegion({ children }: NonTranslatableRegionProps) {
  return (
    <div className="notranslate" translate="no">
      {children}
    </div>
  );
}
