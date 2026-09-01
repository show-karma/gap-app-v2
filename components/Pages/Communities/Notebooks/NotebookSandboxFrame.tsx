"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * The only place author-written HTML is ever rendered.
 *
 * TWO INDEPENDENT CONTAINMENTS, and each one is load-bearing on its own.
 *
 * 1. `sandbox="allow-scripts"` WITHOUT `allow-same-origin`. The document lands
 *    in an opaque origin: it cannot read the parent, our cookies, our storage,
 *    or anything belonging to a real origin. Adding `allow-same-origin`
 *    alongside `allow-scripts` DEFEATS THE SANDBOX ENTIRELY — the frame could
 *    then reach into its own origin's storage and script its way back out. The
 *    two tokens together are the single most dangerous edit anyone can make to
 *    this file, they look innocuous in a diff, and that is why the token list
 *    is a frozen constant with tests that fail if the pair ever appears.
 *
 * 2. A SEPARATE ORIGIN to serve from. Not redundant with the sandbox: the
 *    attribute only applies to the frame, while a stored document is also
 *    reachable by URL and can be opened in a plain tab where no sandbox
 *    exists. Served from our own origin that would be stored XSS against the
 *    app whatever this component does. In this design nothing is
 *    URL-addressable at all — the origin serves only the trusted shell — so
 *    this is the second belt rather than the only one.
 *
 * HOW THE DOCUMENT ACTUALLY GETS THERE, and why it is not the obvious way.
 *
 * The obvious way is `frame.contentWindow.postMessage(html, sandboxOrigin)`.
 * IT SILENTLY DOES NOTHING. Because the frame has no `allow-same-origin` its
 * origin is OPAQUE — the browser compares our target origin against `null`,
 * finds no match, and DISCARDS the message. Exact-origin targeting and the
 * sandbox we require are mutually exclusive, and the resolution is emphatically
 * not to add `allow-same-origin`.
 *
 * So delivery is a MessageChannel:
 *
 *   - the shell announces itself, and we accept that announcement only if it
 *     came from THIS frame's window, from an opaque origin, carrying the nonce
 *     minted for this instance;
 *   - we then send ONE bootstrap message with `targetOrigin: "*"` whose entire
 *     payload is a transferred `MessagePort` — no document, no author data,
 *     nothing worth intercepting even if another frame could receive it;
 *   - every byte of author HTML travels over that private port afterwards.
 *
 * The rule that matters, and the one the tests pin: CONTENT NEVER GOES TO
 * `"*"`. The single wildcard is contentless by construction.
 */

/**
 * Frozen because it is a security control, not a style choice.
 *
 * `allow-scripts` alone. If a custom page ever needs another capability that
 * is a conversation with a security review attached, not a token appended
 * here — and `allow-same-origin` is never that conversation's answer.
 */
export const NOTEBOOK_SANDBOX_ATTRIBUTE = "allow-scripts" as const;

/** Message names, so a stray postMessage from anything else is ignored. */
export const NOTEBOOK_SANDBOX_READY = "karma:notebook-sandbox:ready" as const;
export const NOTEBOOK_SANDBOX_BOOTSTRAP = "karma:notebook-sandbox:port" as const;
export const NOTEBOOK_SANDBOX_DOCUMENT = "karma:notebook-sandbox:document" as const;

/**
 * The origin a sandboxed frame reports.
 *
 * Named rather than inlined so the check below reads as the deliberate test it
 * is: an announcement from a REAL origin is not our sandboxed frame, whatever
 * else it claims about itself.
 */
const OPAQUE_ORIGIN = "null";

function mintNonce(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface Props {
  /** Absolute origin the trusted shell is served from. Never our own. */
  sandboxOrigin: string;
  /** The author's document. Untrusted by construction. */
  html: string;
  title: string;
  className?: string;
}

export function NotebookSandboxFrame({ sandboxOrigin, html, title, className }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const port = useRef<MessagePort | null>(null);
  const [connected, setConnected] = useState(false);

  // One per mounted frame, so an announcement meant for a different instance
  // cannot open this one's channel.
  const nonce = useMemo(mintNonce, []);

  /**
   * How far the handshake has got, readable from the DOM.
   *
   * Deliberately a data attribute rather than logging: this file may not use
   * console, a log line is gone the moment someone reloads, and "the frame is
   * blank and nothing is in the console" is exactly the failure that needs a
   * durable answer. Inspecting the element now says which step stalled — and
   * `rejected` names WHY a message was refused, which is the thing that is
   * otherwise invisible because refusing quietly is the correct behaviour.
   */
  const [state, setState] = useState<"waiting" | "connected">("waiting");
  const [rejected, setRejected] = useState<string | null>(null);
  // One bootstrap per LOAD. A shell that retries its announcement — the
  // natural fix for a lost first one — would otherwise open a fresh channel
  // each time, and the document would go over a port the shell had already
  // discarded. Reset on load, so a genuine reload still reconnects.
  const bootstrapped = useRef(false);

  const handleLoad = useCallback(() => {
    bootstrapped.current = false;
    setState("waiting");
  }, []);

  // useLayoutEffect, not useEffect: this runs synchronously at commit, before
  // paint, which is the earliest React lets us listen. The shell announces
  // itself as soon as it executes, and on a local origin that can be very
  // soon — a listener attached a frame later is a listener that missed it.
  useLayoutEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // THREE CHECKS, none redundant. `source` proves it came from the window
      // we created; the opaque origin proves that window is genuinely
      // sandboxed; the nonce proves it is this instance's shell rather than
      // another sandboxed frame on the same page.
      const data = event.data as { type?: string; nonce?: string } | null;
      // Only diagnose messages that CLAIM to be ours. Every page receives
      // unrelated chatter, and recording that as a rejection would bury the
      // one refusal anybody cares about.
      const claimsToBeOurs = data?.type === NOTEBOOK_SANDBOX_READY;

      if (event.source !== frame.current?.contentWindow) {
        if (claimsToBeOurs) setRejected("source");
        return;
      }
      if (event.origin !== OPAQUE_ORIGIN) {
        if (claimsToBeOurs) setRejected("origin");
        return;
      }
      if (!claimsToBeOurs) return;
      if (data?.nonce !== nonce) {
        setRejected("nonce");
        return;
      }
      if (bootstrapped.current) return;

      bootstrapped.current = true;
      setRejected(null);

      const channel = new MessageChannel();
      port.current = channel.port1;
      // THE ONE PERMITTED WILDCARD, and it carries no content: a type tag, the
      // correlation nonce, and a transferred port. An opaque origin cannot be
      // named, so "*" is the only way to hand the port over at all — which is
      // exactly why the thing handed over is a port and not the document.
      //
      // THE NONCE TRAVELS BOTH WAYS, and it is not redundant with the checks
      // above. Those tell US the announcement came from our frame; this one
      // tells the SHELL the bootstrap was meant for it, so a shell cannot
      // accept a port intended for a different frame instance on the same
      // page, and a replayed bootstrap does not connect. The wildcard makes
      // that the shell's only way to know.
      frame.current?.contentWindow?.postMessage({ type: NOTEBOOK_SANDBOX_BOOTSTRAP, nonce }, "*", [
        channel.port2,
      ]);
      setConnected(true);
      setState("connected");
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      port.current?.close();
      port.current = null;
    };
  }, [nonce]);

  // Author HTML travels ONLY here, over the private channel. A port has no
  // target-origin argument to get wrong, which is the property that makes this
  // safer than any window.postMessage could be under an opaque origin.
  useEffect(() => {
    if (!connected) return;
    port.current?.postMessage({ type: NOTEBOOK_SANDBOX_DOCUMENT, html });
  }, [connected, html]);

  return (
    <iframe
      ref={frame}
      title={title}
      onLoad={handleLoad}
      data-sandbox-state={state}
      data-sandbox-rejected={rejected ?? undefined}
      // The nonce rides in the fragment: the shell reads it to announce itself,
      // and a fragment is never sent to the server.
      src={`${sandboxOrigin}/notebook-sandbox#nonce=${encodeURIComponent(nonce)}`}
      sandbox={NOTEBOOK_SANDBOX_ATTRIBUTE}
      // No allow= list: a custom page has no business with the camera, the
      // microphone, geolocation or payments, and silence is the safe default.
      referrerPolicy="no-referrer"
      className={className ?? "h-[60vh] w-full rounded-2xl border border-border bg-background"}
    />
  );
}
