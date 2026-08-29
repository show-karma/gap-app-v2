import { afterEach, describe, expect, it, vi } from "vitest";
import contract from "@/utilities/notebooks/hosting-contract.json";

/**
 * The notebook route's headers are one of the two guardrails that make
 * same-origin hosting of a tenant-authored notebook tenable (the other is the
 * sandbox attribute). `connect-src` is the directive that matters: it is what
 * stops a script running inside the frame from fetching and executing
 * arbitrary code — Python wheels in particular — on gap-app-v2's own origin.
 *
 * The policy is not this repo's invention. `hosting-contract.json` is copied
 * verbatim from the karma-notebooks CI run that produced the bundle we serve,
 * and these tests assert what we emit matches it in BOTH directions: looser
 * means Tester validates a configuration CI never exercised, stricter means the
 * notebook does not boot.
 */

const ORIGINAL_URL = process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
const CONTRACT_API_ORIGIN = contract.externalConnectOrigins[0];

async function loadCsp(indexerUrl: string | undefined) {
  vi.resetModules();
  if (indexerUrl === undefined) {
    delete process.env.NEXT_PUBLIC_GAP_INDEXER_URL;
  } else {
    process.env.NEXT_PUBLIC_GAP_INDEXER_URL = indexerUrl;
  }
  return import("@/utilities/notebooks/csp");
}

function directives(csp: string): Map<string, string> {
  return new Map(
    csp
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...rest] = part.split(/\s+/);
        return [name, rest.join(" ")] as const;
      })
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

describe("notebook hosting contract", () => {
  // The single assertion that catches drift in either direction.
  it("emits exactly the CSP the bundle was verified against", async () => {
    const { notebookCsp } = await loadCsp(CONTRACT_API_ORIGIN);

    expect(directives(notebookCsp())).toEqual(
      directives(contract.headers["Content-Security-Policy"])
    );
  });

  it("serves the route the contract names", async () => {
    const { NOTEBOOK_ASSET_SOURCE } = await loadCsp(CONTRACT_API_ORIGIN);

    expect(NOTEBOOK_ASSET_SOURCE).toBe(contract.route);
  });

  it.each(Object.entries(contract.headers))(
    "emits the contract's %s header",
    async (key, value) => {
      const { notebookHeaders } = await loadCsp(CONTRACT_API_ORIGIN);
      const emitted = notebookHeaders().find((header) => header.key === key);

      expect(emitted).toBeDefined();
      if (key === "Content-Security-Policy") {
        expect(directives(emitted!.value)).toEqual(directives(value as string));
      } else {
        expect(emitted!.value).toBe(value);
      }
    }
  );

  // Without this the frame never boots: sandboxed with no allow-same-origin
  // means an opaque origin, so the bundle's own fetches for the vendored
  // runtime and wheels are cross-origin with Origin: null.
  it("allows the opaque-origin frame to fetch its own subresources", async () => {
    const { notebookHeaders } = await loadCsp(CONTRACT_API_ORIGIN);
    const headers = notebookHeaders();

    expect(headers.find((h) => h.key === "Access-Control-Allow-Origin")?.value).toBe("*");
    // A wildcard with credentials is rejected by every browser; never pair them.
    expect(headers.some((h) => h.key === "Access-Control-Allow-Credentials")).toBe(false);
  });

  it("pins the inline bootstrap by hash instead of allowing inline scripts", async () => {
    const { notebookCsp, NOTEBOOK_INLINE_SCRIPT_HASHES } = await loadCsp(CONTRACT_API_ORIGIN);
    const scriptSrc = directives(notebookCsp()).get("script-src")!;

    expect([...NOTEBOOK_INLINE_SCRIPT_HASHES]).toEqual(contract.inlineScriptHashes);
    for (const hash of contract.inlineScriptHashes) {
      expect(scriptSrc).toContain(hash);
    }
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("allows wasm compilation, which Pyodide needs", async () => {
    const { notebookCsp } = await loadCsp(CONTRACT_API_ORIGIN);

    expect(directives(notebookCsp()).get("script-src")).toContain("'wasm-unsafe-eval'");
  });

  describe("connect-src", () => {
    it("names only self and the origins the bundle was built to call", async () => {
      const { notebookCsp } = await loadCsp(CONTRACT_API_ORIGIN);

      expect(directives(notebookCsp()).get("connect-src")).toBe(
        `'self' ${contract.externalConnectOrigins.join(" ")}`
      );
    });

    // The API base URL is baked into the bundle at export time, so it belongs
    // to the artifact, not the deployment. Reading this app's indexer env
    // instead would match in production and silently block every data fetch on
    // a preview pointed at a different indexer — the notebook would render and
    // then sit empty, which is the worst kind of failure to hand a validator.
    it.each([
      ["a staging indexer", "https://stagapi.karmahq.org"],
      ["a localhost indexer", "http://localhost:3001"],
      ["missing", undefined],
      ["empty", ""],
      ["not a URL", "not-a-url"],
    ])("does not vary when the app's own indexer env is %s", async (_label, value) => {
      const { notebookCsp } = await loadCsp(value);

      expect(directives(notebookCsp()).get("connect-src")).toBe(
        `'self' ${contract.externalConnectOrigins.join(" ")}`
      );
    });

    // The whole reason vendoring was a deployment gate: any of these hosts
    // would let the frame pull and run arbitrary wheels at view time.
    it.each(["pypi.org", "files.pythonhosted.org", "cdn.jsdelivr.net", "unpkg.com", "esm.sh"])(
      "never allows %s",
      async (host) => {
        const { notebookCsp } = await loadCsp(CONTRACT_API_ORIGIN);

        expect(notebookCsp()).not.toContain(host);
      }
    );

    it("never uses a wildcard anywhere in the policy", async () => {
      const { notebookCsp } = await loadCsp(CONTRACT_API_ORIGIN);

      expect(notebookCsp()).not.toContain("*");
    });
  });

  describe("containment", () => {
    it("denies everything not named", async () => {
      const { notebookCsp } = await loadCsp(CONTRACT_API_ORIGIN);

      expect(directives(notebookCsp()).get("default-src")).toBe("'none'");
    });

    it.each(["object-src", "base-uri", "form-action"])("locks down %s", async (name) => {
      const { notebookCsp } = await loadCsp(CONTRACT_API_ORIGIN);

      expect(directives(notebookCsp()).get(name)).toBe("'none'");
    });

    it("keeps the bundle framable only by this app", async () => {
      const { notebookCsp } = await loadCsp(CONTRACT_API_ORIGIN);

      expect(directives(notebookCsp()).get("frame-ancestors")).toBe("'self'");
    });
  });

  describe("route scoping", () => {
    it("covers every path under the bundle prefix", async () => {
      const { NOTEBOOK_ASSET_PATH_PREFIX, NOTEBOOK_ASSET_SOURCE } =
        await loadCsp(CONTRACT_API_ORIGIN);

      expect(NOTEBOOK_ASSET_PATH_PREFIX).toBe("/notebooks");
      expect(NOTEBOOK_ASSET_SOURCE).toBe("/notebooks/:path*");
    });
  });
});

/**
 * F11: every asset was served `public, max-age=0, must-revalidate`, so a repeat
 * visit revalidated ~345 requests including a 9.6MB wasm — forfeiting the
 * "repeat visit is fast" property the page depends on.
 */
/** Concrete path prefix a cache rule matches, for the pilot bundle. */
function concretePrefix(source: string): string {
  return source
    .slice(0, source.indexOf(":path*"))
    .replace(":community", "filecoin")
    .replace(":slug", "grants-overview")
    .replace(/\/{2,}/g, "/");
}

describe("notebook asset caching", () => {
  it("caches the content-addressed directories immutably for a year", async () => {
    const { notebookAssetCacheRules, NOTEBOOK_IMMUTABLE_CACHE_CONTROL } =
      await loadCsp(CONTRACT_API_ORIGIN);

    expect(NOTEBOOK_IMMUTABLE_CACHE_CONTROL).toBe("public, max-age=31536000, immutable");
    for (const rule of notebookAssetCacheRules()) {
      expect(rule.headers).toEqual([
        { key: "Cache-Control", value: NOTEBOOK_IMMUTABLE_CACHE_CONTROL },
      ]);
    }
  });

  it("covers the hashed bundle assets and the pyodide runtime", async () => {
    const { notebookAssetCacheRules } = await loadCsp(CONTRACT_API_ORIGIN);
    const sources = notebookAssetCacheRules().map((rule) => rule.source);

    expect(sources).toEqual([
      "/notebooks/:community/:slug/assets/:path*",
      "/notebooks/:community/:slug/pyodide/:path*",
    ]);
  });

  // The entry document is what points at the hashed assets. Caching it would
  // pin a reader to an old bundle indefinitely, which is exactly the bug a
  // rollback is supposed to fix.
  it("never matches the entry document", async () => {
    const { notebookAssetCacheRules } = await loadCsp(CONTRACT_API_ORIGIN);

    for (const rule of notebookAssetCacheRules()) {
      expect(
        "/notebooks/filecoin/grants-overview/index.html".startsWith(concretePrefix(rule.source))
      ).toBe(false);
    }
  });

  it.each(["storage-shim.js", "nb-interactive.js", "manifest.json", "favicon.ico"])(
    "leaves the unversioned file %s revalidating",
    async (file) => {
      const { notebookAssetCacheRules } = await loadCsp(CONTRACT_API_ORIGIN);
      const url = `/notebooks/filecoin/grants-overview/${file}`;

      for (const rule of notebookAssetCacheRules()) {
        expect(url.startsWith(concretePrefix(rule.source))).toBe(false);
      }
    }
  );

  // Next emits the headers of EVERY matching rule, so two rules setting
  // Cache-Control on one path would send the header twice.
  it("does not overlap another rule that sets Cache-Control", async () => {
    const nextConfig = (await import("@/next.config")).default;
    const rules = (await nextConfig.headers!()) as {
      source: string;
      headers: { key: string; value: string }[];
    }[];
    const cacheRules = rules.filter((rule) =>
      rule.headers.some((header) => header.key === "Cache-Control")
    );

    for (const url of [
      "/notebooks/filecoin/grants-overview/assets/app-DeX3BBVP.js",
      "/notebooks/filecoin/grants-overview/pyodide/pyodide.asm.wasm",
      "/notebooks/filecoin/grants-overview/index.html",
    ]) {
      const matches = cacheRules.filter((rule) => {
        const prefix = rule.source
          .replace(/:path\*$/, "")
          .replace(":community", "filecoin")
          .replace(":slug", "grants-overview");
        return url.startsWith(prefix) && !prefix.startsWith("/_next");
      });
      expect(matches.length).toBeLessThanOrEqual(1);
    }
  });

  // The security headers and the cache headers are separate rules on
  // overlapping paths; that is fine only while they share no header key.
  it("sets no header the security rule already sets", async () => {
    const { notebookAssetCacheRules, notebookHeaders } = await loadCsp(CONTRACT_API_ORIGIN);
    const securityKeys = new Set(notebookHeaders().map((header) => header.key));

    for (const rule of notebookAssetCacheRules()) {
      for (const header of rule.headers) {
        expect(securityKeys.has(header.key)).toBe(false);
      }
    }
  });
});
