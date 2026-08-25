import type { Event, StackFrame } from "@sentry/nextjs";

/**
 * Wallet/browser extensions inject scripts into every page they run on. When
 * two of them fight over the same global (`window.ethereum` is the classic
 * one) each wraps the other's `request` in a `Proxy`, the two wrappers
 * delegate to each other forever, and the page gets a
 * `RangeError: Maximum call stack size exceeded` whose stack contains nothing
 * but extension frames.
 *
 * These events are unactionable — no line of this repo appears in the stack —
 * but they still burn error quota, trigger alerts, and (because
 * `replaysOnErrorSampleRate` is 1.0) pull a session replay up with them.
 *
 * Detecting them is harder than it looks. `@sentry/nextjs`'s client frame
 * normalisation rewrites the origin of EVERY frame to `app://`, so by the time
 * `beforeSend` runs an extension frame is indistinguishable *by scheme* from a
 * first-party one. What survives the rewrite is the path, and that is enough:
 *
 *   - everything this app ships is served from `/_next/static/…`, so a
 *     first-party frame always contains `/_next/`;
 *   - `public/` contains no `.js` at all and neither `assetPrefix` nor
 *     `basePath` is configured, so this app can never produce a root-level
 *     `.js` frame — one of those can only be a script something else injected.
 *
 * Deliberately keyed off frame provenance and NOT off the message: "Maximum
 * call stack size exceeded" is exactly what a genuine runaway recursion in our
 * own code would say, and that we very much want to see.
 *
 * See https://karma-crypto-inc.sentry.io/issues/GAP-FRONTEND-26Q
 * Supersedes the single-filename `denyUrls` entry added for GAP-FRONTEND-257.
 */

const EXTENSION_SCHEME =
  /^(?:chrome-extension|moz-extension|safari-web-extension|safari-extension|webkit-masked-url):\/\//i;

/**
 * A `.js` file with no directory segment, with or without the `app:///` prefix
 * the Next.js frame normaliser adds. Matches the shapes seen in production
 * (`app:///injectLeap.js`, `app:///inject.chrome.11349145.js`,
 * `app:///injectedScript.bundle.js`) and the bare form Chrome reports when the
 * injected script carries a relative `//# sourceURL` (`injectLeap.js`).
 */
const ROOT_LEVEL_SCRIPT = /^(?:app:\/\/\/)?[\w.-]+\.js$/;

/**
 * Markers the browser emits *deliberately* for code with no source URL. These
 * are positive statements of "this frame is synthetic", so they are neutral
 * evidence. An absent or blank `filename` is a different thing entirely — it
 * means the frame carries no provenance at all — and is handled separately.
 */
const SYNTHETIC_FRAMES = new Set(["<anonymous>", "[native code]", "native"]);

const FIRST_PARTY_SEGMENT = "/_next/";

function isFirstPartyFrame(filename: string): boolean {
  return filename.includes(FIRST_PARTY_SEGMENT);
}

function isInjectedScriptFrame(filename: string): boolean {
  return EXTENSION_SCHEME.test(filename) || ROOT_LEVEL_SCRIPT.test(filename);
}

/**
 * True when the event's stack consists solely of injected-script frames and
 * synthetic frames — i.e. no first-party code is involved at any depth.
 *
 * Conservative by construction: a frame that is neither synthetic nor
 * positively identifiable as an injected script keeps the event. An event with
 * no stack frames at all also keeps the event — absence of evidence is not
 * evidence of an extension.
 */
export function isBrowserExtensionOnlyError(event: Event): boolean {
  const values = event.exception?.values;
  if (!values?.length) {
    return false;
  }

  let sawInjectedFrame = false;
  let sawAnyFrame = false;

  for (const value of values) {
    const frames: StackFrame[] | undefined = value.stacktrace?.frames;
    if (!frames?.length) {
      continue;
    }

    for (const frame of frames) {
      const filename = frame.filename?.trim();
      sawAnyFrame = true;

      // No filename at all: the frame tells us nothing about who owns it, so
      // it cannot count towards "the whole stack is somebody else's code".
      // Fail open rather than guessing.
      if (!filename) {
        return false;
      }
      if (SYNTHETIC_FRAMES.has(filename)) {
        continue;
      }
      if (isFirstPartyFrame(filename)) {
        return false;
      }
      if (isInjectedScriptFrame(filename)) {
        sawInjectedFrame = true;
        continue;
      }
      return false;
    }
  }

  return sawAnyFrame && sawInjectedFrame;
}
