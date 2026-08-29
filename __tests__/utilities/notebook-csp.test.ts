import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The notebook CSP is one of the two guardrails that make same-origin hosting
 * of tenant-authored notebooks tenable (the other is the sandbox attribute).
 * `connect-src` is the directive that matters: it is what stops a script
 * running inside the frame from fetching and executing arbitrary code — Python
 * wheels in particular — on gap-app-v2's own origin.
 */

const ORIGINAL_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;

async function loadCsp(indexerUrl: string | undefined) {
  vi.resetModules();
  if (indexerUrl === undefined) {
    delete process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  } else {
    process.env.NEXT_PUBLIC_GAP_INDEXER_URL = indexerUrl;
  }
  return import("@/utilities/notebooks/csp");
}

function directive(csp: string, name: string): string {
  return (
    csp
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name} `) || part === name) ?? ""
  );
}

afterEach(() => {
  if (ORIGINAL_URL === undefined) {
    delete process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  } else {
    process.env.NEXT_PUBLIC_GAP_INDEXER_URL = ORIGINAL_URL;
  }
  vi.resetModules();
});

describe("notebook CSP", () => {
  describe("connect-src", () => {
    it("names only self and the GAP API origin", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(directive(notebookCsp(), "connect-src")).toBe(
        "connect-src 'self' https://gapapi.karmahq.xyz"
      );
    });

    it("reduces a URL with a path to its origin", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz/v2/");

      expect(directive(notebookCsp(), "connect-src")).toBe(
        "connect-src 'self' https://gapapi.karmahq.xyz"
      );
    });

    it("follows the environment so previews reach the staging indexer", async () => {
      const { notebookCsp } = await loadCsp("https://stagapi.karmahq.org");

      expect(directive(notebookCsp(), "connect-src")).toContain("https://stagapi.karmahq.org");
    });

    // A blank or malformed value must not degrade into a permissive policy.
    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["not a URL", "not-a-url"],
    ])("falls back to a real origin when the env var is %s", async (_label, value) => {
      const { notebookCsp } = await loadCsp(value);
      const connectSrc = directive(notebookCsp(), "connect-src");

      expect(connectSrc).not.toContain("*");
      expect(connectSrc.split(/\s+/).length).toBe(3);
    });

    // The whole reason vendoring is a deployment gate: any of these hosts here
    // would let the frame pull and run arbitrary wheels at view time.
    it.each([
      "pypi.org",
      "files.pythonhosted.org",
      "cdn.jsdelivr.net",
      "unpkg.com",
      "esm.sh",
    ])("never allows %s", async (host) => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(notebookCsp()).not.toContain(host);
    });

    it("never uses a wildcard anywhere in the policy", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(notebookCsp()).not.toContain("*");
    });
  });

  describe("script execution", () => {
    // Pyodide compiles WebAssembly; this token permits that and nothing else.
    it("allows wasm compilation", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(directive(notebookCsp(), "script-src")).toContain("'wasm-unsafe-eval'");
    });

    it("does not allow unsafe-eval of JavaScript", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(directive(notebookCsp(), "script-src")).not.toContain("'unsafe-eval'");
    });

    it("allows the blob worker Pyodide runs in", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(directive(notebookCsp(), "worker-src")).toContain("blob:");
    });
  });

  describe("containment", () => {
    it("stops the notebook framing anything itself", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(directive(notebookCsp(), "frame-src")).toBe("frame-src 'none'");
    });

    it("stops the notebook submitting a form anywhere", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(directive(notebookCsp(), "form-action")).toBe("form-action 'none'");
    });

    it("keeps the bundle framable only by this app", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(directive(notebookCsp(), "frame-ancestors")).toBe("frame-ancestors 'self'");
    });

    it("pins the base URI so a script cannot retarget relative fetches", async () => {
      const { notebookCsp } = await loadCsp("https://gapapi.karmahq.xyz");

      expect(directive(notebookCsp(), "base-uri")).toBe("base-uri 'none'");
    });
  });

  describe("route scoping", () => {
    it("covers every path under the bundle prefix", async () => {
      const { NOTEBOOK_ASSET_PATH_PREFIX, NOTEBOOK_ASSET_SOURCE } = await loadCsp(
        "https://gapapi.karmahq.xyz"
      );

      expect(NOTEBOOK_ASSET_PATH_PREFIX).toBe("/notebooks");
      expect(NOTEBOOK_ASSET_SOURCE).toBe("/notebooks/:path*");
    });
  });
});
