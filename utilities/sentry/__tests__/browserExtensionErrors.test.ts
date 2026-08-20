import type { Event, StackFrame } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { isBrowserExtensionOnlyError } from "../browserExtensionErrors";

function frame(filename: string, fn?: string): StackFrame {
  return { filename, function: fn };
}

function errorEvent(frames: StackFrame[], value = "Maximum call stack size exceeded"): Event {
  return {
    exception: {
      values: [
        {
          type: "RangeError",
          value,
          mechanism: { type: "onunhandledrejection", handled: false },
          stacktrace: { frames },
        },
      ],
    },
  };
}

/**
 * Verbatim frame sequence from GAP-FRONTEND-26Q, event
 * 51f73905fe9748d4aff95774c7467980 (release b37f3e3, /project/tastech-and-sun).
 * Sentry stores frames oldest-first, so this is the reported stack reversed.
 */
const GAP_FRONTEND_26Q_FRAMES: StackFrame[] = [
  frame("app:///injectLeap.js", "I.resume"),
  frame("app:///injectLeap.js", "I.on"),
  frame("app:///injectLeap.js"),
  frame("<anonymous>", "new Promise"),
  frame("app:///injectLeap.js", "ty.<anonymous>"),
  frame("<anonymous>", "Generator.next"),
  frame("app:///injectLeap.js"),
  frame("<anonymous>", "new Promise"),
  frame("app:///injectLeap.js", "tp"),
  frame("app:///injectLeap.js", "ty.request"),
  frame("app:///inject.chrome.11349145.js", "Object.apply"),
  frame("app:///inject.chrome.11349145.js", "Object.apply"),
  frame("app:///injectLeap.js"),
  frame("<anonymous>", "new Promise"),
  frame("app:///injectLeap.js", "ty.<anonymous>"),
  frame("<anonymous>", "Generator.next"),
  frame("app:///injectLeap.js"),
  frame("<anonymous>", "new Promise"),
  frame("app:///injectLeap.js", "tp"),
  frame("app:///injectLeap.js", "ty.request"),
];

describe("isBrowserExtensionOnlyError — drops unactionable extension noise", () => {
  it("drops the GAP-FRONTEND-26Q Leap↔injected-wallet recursion verbatim", () => {
    expect(isBrowserExtensionOnlyError(errorEvent(GAP_FRONTEND_26Q_FRAMES))).toBe(true);
  });

  it("drops the bare `//# sourceURL` filename shape Chrome reports", () => {
    // The same collision, reproduced locally: when the injected script carries a
    // relative `//# sourceURL` the frame has no `app:///` prefix at all.
    expect(
      isBrowserExtensionOnlyError(
        errorEvent([
          frame("injectLeap.js", "LeapProvider._send"),
          frame("<anonymous>", "new Promise"),
          frame("injectLeap.js", "LeapProvider.request"),
          frame("inject.chrome.11349145.js", "Object.apply"),
        ])
      )
    ).toBe(true);
  });

  it("drops frames that still carry an extension scheme", () => {
    for (const scheme of [
      "chrome-extension://kmhcihpebfmpgmihbkipmjlmmioameka/injectLeap.js",
      "moz-extension://1234-5678/inpage.js",
      "safari-web-extension://ABCD/content.js",
      "webkit-masked-url://hidden/",
    ]) {
      expect(isBrowserExtensionOnlyError(errorEvent([frame(scheme, "x")]))).toBe(true);
    }
  });

  it("still drops the GAP-FRONTEND-257 injected bundle this supersedes", () => {
    expect(
      isBrowserExtensionOnlyError(
        errorEvent(
          [frame("app:///injectedScript.bundle.js", "n")],
          "Cannot read properties of undefined (reading 'sendMessage')"
        )
      )
    ).toBe(true);
  });
});

describe("isBrowserExtensionOnlyError — never masks first-party failures", () => {
  it("keeps a genuine runaway recursion in our own code", () => {
    // The message is identical to the extension noise. Only provenance
    // separates them, which is exactly why this filter is frame-based.
    expect(
      isBrowserExtensionOnlyError(
        errorEvent([
          frame("app:///_next/static/chunks/app/project/%5BprojectId%5D/page-abc.js", "walk"),
          frame("app:///_next/static/chunks/app/project/%5BprojectId%5D/page-abc.js", "walk"),
        ])
      )
    ).toBe(false);
  });

  it("keeps a mixed stack where our code appears at any depth", () => {
    expect(
      isBrowserExtensionOnlyError(
        errorEvent([
          frame("app:///injectLeap.js", "ty.request"),
          frame("app:///_next/static/chunks/main-app-1234.js", "connectWallet"),
          frame("app:///injectLeap.js", "ty.request"),
        ])
      )
    ).toBe(false);
  });

  it("keeps errors whose frames sit under a path (not root-level scripts)", () => {
    expect(
      isBrowserExtensionOnlyError(errorEvent([frame("app:///some/vendor/widget.js", "boot")]))
    ).toBe(false);
  });

  it("keeps events with no exception values", () => {
    expect(isBrowserExtensionOnlyError({ message: "something happened" })).toBe(false);
  });

  it("keeps events whose exception has no stack frames", () => {
    expect(
      isBrowserExtensionOnlyError({
        exception: { values: [{ type: "Error", value: "boom" }] },
      })
    ).toBe(false);
  });

  it("keeps a stack where an injected frame sits beside a filename-less frame", () => {
    // A frame with no filename is not the same as `<anonymous>`: the browser
    // emits `<anonymous>` deliberately, whereas an absent filename means we
    // simply do not know who owns the frame. Never suppress on a guess.
    expect(
      isBrowserExtensionOnlyError(
        errorEvent([frame("app:///injectLeap.js", "ty.request"), { function: "unknown" }])
      )
    ).toBe(false);
  });

  it("keeps a stack where an injected frame sits beside a blank filename", () => {
    expect(
      isBrowserExtensionOnlyError(
        errorEvent([frame("app:///injectLeap.js", "ty.request"), frame("   ", "unknown")])
      )
    ).toBe(false);
  });

  it("keeps a stack made only of synthetic frames", () => {
    expect(
      isBrowserExtensionOnlyError(
        errorEvent([frame("<anonymous>", "new Promise"), frame("[native code]", "apply")])
      )
    ).toBe(false);
  });
});
