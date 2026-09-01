"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The only place author-written HTML is ever rendered.
 *
 * TWO INDEPENDENT CONTAINMENTS, and each one is load-bearing on its own.
 *
 * 1. `sandbox="allow-scripts"` WITHOUT `allow-same-origin`. The document lands
 *    in an opaque origin: it cannot read the parent, our cookies, our storage,
 *    or anything belonging to a real origin. Adding `allow-same-origin`
 *    alongside `allow-scripts` DEFEATS THE SANDBOX ENTIRELY — the frame could
 *    then reach into its own origin's storage and, worse, script its way back
 *    out. The two tokens together are the single most dangerous edit anyone
 *    can make to this file, they look innocuous in a diff, and that is exactly
 *    why `SANDBOX` below is a frozen constant with a test that fails the build
 *    if the pair ever appears.
 *
 * 2. A SEPARATE ORIGIN to serve from. This one is not redundant with the
 *    sandbox, and the reason is easy to miss: the sandbox attribute only
 *    applies to the frame. A stored HTML document is also reachable by URL,
 *    and anyone can open that URL in a plain tab where NO sandbox attribute
 *    exists. If that document were served from our own origin it would be
 *    stored XSS against the app, whatever this component does. So custom pages
 *    are served from `SANDBOX_ORIGIN`, and the blast radius of any escape is
 *    an origin that holds nothing.
 *
 * WHY POST THE HTML RATHER THAN PUT IT IN THE URL. A draft has not been saved,
 * so there is nothing to link to yet — and review has to happen BEFORE saving,
 * or the review is theatre. The frame therefore loads a fixed, trusted shell
 * from the sandbox origin and the document is handed over with `postMessage`.
 * The shell is ours; the payload is the author's; the boundary between them is
 * the browser's, not ours.
 */

/**
 * Frozen because it is a security control, not a style choice.
 *
 * `allow-scripts` alone. If a custom page ever needs another capability, that
 * is a conversation with a security review attached, not a token appended
 * here — and `allow-same-origin` is never that conversation's answer.
 */
export const NOTEBOOK_SANDBOX_ATTRIBUTE = "allow-scripts" as const;

/** The message the shell expects. Named so a stray postMessage is ignored. */
export const NOTEBOOK_SANDBOX_MESSAGE = "karma:notebook-custom-html" as const;

interface Props {
  /** Absolute origin the sandbox shell is served from. Never our own. */
  sandboxOrigin: string;
  /** The author's document. Untrusted by construction. */
  html: string;
  title: string;
  className?: string;
}

export function NotebookSandboxFrame({ sandboxOrigin, html, title, className }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  // The shell tells us when it can accept a document. Waiting for that beats
  // guessing at load timing, and a message sent before it is listening is
  // simply lost — which would look like a blank page for no reason.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== sandboxOrigin) return;
      if (event.data === `${NOTEBOOK_SANDBOX_MESSAGE}:ready`) setReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sandboxOrigin]);

  useEffect(() => {
    if (!ready) return;
    // Targeted at the sandbox origin explicitly, never "*": posting to a
    // wildcard would hand the document to whatever happens to be framed if
    // the src is ever wrong.
    frame.current?.contentWindow?.postMessage(
      { type: NOTEBOOK_SANDBOX_MESSAGE, html },
      sandboxOrigin
    );
  }, [ready, html, sandboxOrigin]);

  return (
    <iframe
      ref={frame}
      // biome-ignore lint/a11y/useIframeTitle: title is supplied by the caller
      title={title}
      src={`${sandboxOrigin}/notebook-sandbox`}
      sandbox={NOTEBOOK_SANDBOX_ATTRIBUTE}
      // No allow= list: a custom page has no business with the camera, the
      // microphone, geolocation or payments, and silence is the safe default.
      referrerPolicy="no-referrer"
      loading="lazy"
      className={className ?? "h-[60vh] w-full rounded-2xl border border-border bg-background"}
    />
  );
}
