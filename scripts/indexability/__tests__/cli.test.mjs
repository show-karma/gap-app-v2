import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
// Importing the CLI must not execute it (import-safe guard).
import { main, parseArgs } from "../../verify-indexability.mjs";

function fakeStream() {
  const chunks = [];
  return {
    write(chunk) {
      chunks.push(chunk);
      return true;
    },
    text() {
      return chunks.join("");
    },
  };
}

function makeReport(ok) {
  return {
    timestamp: "2026-07-14T00:00:00.000Z",
    origins: { canonical: "C", apex: "A", gap: "G", indexer: "I" },
    sitemap: { sitemapCount: 3, leafCount: 4200 },
    representativeProject: "/project/x",
    checks: [
      { name: "root", ok: true },
      { name: "indexer-decision", ok },
    ],
    errors: ok ? [] : ["indexer-decision: check failed"],
    ok,
  };
}

function captureVerify(report) {
  const calls = [];
  const verify = async (options) => {
    calls.push(options);
    return report;
  };
  verify.calls = calls;
  return verify;
}

async function withTempDir(run) {
  const dir = await mkdtemp(join(tmpdir(), "indexability-cli-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("parseArgs", () => {
  it("parses known flags in both --flag value and --flag=value forms", () => {
    const flags = parseArgs([
      "--canonical-origin=https://x",
      "--timeout-ms",
      "5",
      "--output",
      "/tmp/r.json",
    ]);
    assert.equal(flags.canonicalOrigin, "https://x");
    assert.equal(flags.timeoutMs, "5");
    assert.equal(flags.output, "/tmp/r.json");
  });

  it("rejects unknown flags", () => {
    assert.throws(() => parseArgs(["--nope", "x"]), /Unknown argument/);
  });

  it("rejects a missing value", () => {
    assert.throws(() => parseArgs(["--min-leaf-count"]), /Missing value/);
    assert.throws(() => parseArgs(["--min-leaf-count", "--output", "x"]), /Missing value/);
  });
});

describe("main configuration", () => {
  it("applies production defaults", async () => {
    const verify = captureVerify(makeReport(true));
    const code = await main({
      argv: [],
      env: {},
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });

    assert.equal(code, 0);
    const options = verify.calls[0];
    assert.equal(options.canonicalOrigin, "https://www.karmahq.xyz");
    assert.equal(options.apexOrigin, "https://karmahq.xyz");
    assert.equal(options.gapOrigin, "https://gap.karmahq.xyz");
    assert.equal(options.indexerBaseUrl, "https://gapapi.karmahq.xyz");
    assert.equal(options.rootSitemapUrl, "https://www.karmahq.xyz/sitemap_index.xml");
    assert.equal(options.minLeafCount, 3800);
    assert.equal(options.timeoutMs, 15000);
  });

  it("applies INDEXABILITY_ env overrides and derives the root from the canonical", async () => {
    const verify = captureVerify(makeReport(true));
    await main({
      argv: [],
      env: {
        INDEXABILITY_CANONICAL_ORIGIN: "https://c.example",
        INDEXABILITY_MIN_LEAF_COUNT: "10",
        INDEXABILITY_TIMEOUT_MS: "500",
      },
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });

    const options = verify.calls[0];
    assert.equal(options.canonicalOrigin, "https://c.example");
    assert.equal(options.minLeafCount, 10);
    assert.equal(options.timeoutMs, 500);
    assert.equal(options.rootSitemapUrl, "https://c.example/sitemap_index.xml");
  });

  it("lets flags win over env and derives the root from the flag canonical", async () => {
    const verify = captureVerify(makeReport(true));
    await main({
      argv: ["--canonical-origin=https://flag.example", "--min-leaf-count", "20"],
      env: {
        INDEXABILITY_CANONICAL_ORIGIN: "https://env.example",
        INDEXABILITY_MIN_LEAF_COUNT: "10",
      },
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });

    const options = verify.calls[0];
    assert.equal(options.canonicalOrigin, "https://flag.example");
    assert.equal(options.minLeafCount, 20);
    assert.equal(options.rootSitemapUrl, "https://flag.example/sitemap_index.xml");
  });

  it("uses an explicit root sitemap url verbatim even when canonical changes", async () => {
    const verify = captureVerify(makeReport(true));
    await main({
      argv: [
        "--root-sitemap-url",
        "https://c.example/custom.xml",
        "--canonical-origin",
        "https://other.example",
      ],
      env: {},
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });

    assert.equal(verify.calls[0].rootSitemapUrl, "https://c.example/custom.xml");
  });

  it("returns 1 without running verify on invalid numeric args", async () => {
    const verify = captureVerify(makeReport(true));
    const stderr = fakeStream();
    const code = await main({
      argv: ["--min-leaf-count", "abc"],
      env: {},
      verify,
      stdout: fakeStream(),
      stderr,
    });

    assert.equal(code, 1);
    assert.equal(verify.calls.length, 0);
    assert.match(stderr.text(), /Invalid numeric value for --min-leaf-count/);
  });

  it("returns 1 without running verify on unknown flags", async () => {
    const verify = captureVerify(makeReport(true));
    const code = await main({
      argv: ["--bogus"],
      env: {},
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });

    assert.equal(code, 1);
    assert.equal(verify.calls.length, 0);
  });
});

describe("main output + exit codes", () => {
  it("writes pretty JSON (creating parent dirs) and exits 0 on success", async () => {
    await withTempDir(async (dir) => {
      const outputPath = join(dir, "nested", "report.json");
      const stdout = fakeStream();
      const verify = captureVerify(makeReport(true));

      const code = await main({
        argv: ["--output", outputPath],
        env: {},
        verify,
        stdout,
        stderr: fakeStream(),
      });

      assert.equal(code, 0);
      const content = await readFile(outputPath, "utf8");
      const parsed = JSON.parse(content);
      assert.equal(parsed.ok, true);
      assert.match(content, /\n {2}"ok": true/); // pretty-printed, 2-space indent
      assert.match(stdout.text(), /Overall: PASS/);
      assert.match(stdout.text(), /PASS root/);
    });
  });

  it("still writes the report and exits 1 on failure", async () => {
    await withTempDir(async (dir) => {
      const outputPath = join(dir, "report.json");
      const stdout = fakeStream();
      const verify = captureVerify(makeReport(false));

      const code = await main({
        argv: ["--output", outputPath],
        env: {},
        verify,
        stdout,
        stderr: fakeStream(),
      });

      assert.equal(code, 1);
      const parsed = JSON.parse(await readFile(outputPath, "utf8"));
      assert.equal(parsed.ok, false);
      assert.match(stdout.text(), /Overall: FAIL/);
    });
  });

  it("exits 1 without an output file when the report is not ok and no output is set", async () => {
    const verify = captureVerify(makeReport(false));
    const code = await main({
      argv: [],
      env: {},
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });
    assert.equal(code, 1);
  });
});

describe("main failure handling", () => {
  it("writes a structured failure report and exits 1 when the verifier throws with --output set", async () => {
    await withTempDir(async (dir) => {
      const outputPath = join(dir, "nested", "report.json");
      const stderr = fakeStream();
      const verify = async () => {
        throw new Error("boom-verifier");
      };

      const code = await main({
        argv: ["--output", outputPath, "--canonical-origin", "https://c.example"],
        env: {},
        verify,
        stdout: fakeStream(),
        stderr,
      });

      assert.equal(code, 1);
      assert.match(stderr.text(), /boom-verifier/);

      const parsed = JSON.parse(await readFile(outputPath, "utf8"));
      assert.equal(parsed.ok, false);
      assert.equal(parsed.sitemap.sitemapCount, 0);
      assert.equal(parsed.sitemap.leafCount, 0);
      assert.deepEqual(parsed.checks, []);
      assert.ok(parsed.errors.some((error) => error.includes("boom-verifier")));
      assert.equal(parsed.origins.canonical, "https://c.example");
      assert.equal(parsed.origins.indexer, "https://gapapi.karmahq.xyz");
      assert.equal(typeof parsed.timestamp, "string");
      assert.ok(parsed.timestamp.length > 0);
    });
  });

  it("returns 1 and reports both errors when the verifier throws and the failure-report write also fails", async () => {
    const stderr = fakeStream();
    const verify = async () => {
      throw new Error("boom-verifier");
    };
    const writeFile = async () => {
      throw new Error("disk-full");
    };

    const code = await main({
      argv: ["--output", "/some/report.json"],
      env: {},
      verify,
      writeFile,
      mkdir: async () => {},
      stdout: fakeStream(),
      stderr,
    });

    assert.equal(code, 1);
    assert.match(stderr.text(), /boom-verifier/);
    assert.match(stderr.text(), /disk-full/);
  });
});

describe("strict numeric validation", () => {
  it("accepts --min-leaf-count 0 (nonnegative)", async () => {
    const verify = captureVerify(makeReport(true));
    const code = await main({
      argv: ["--min-leaf-count", "0"],
      env: {},
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });
    assert.equal(code, 0);
    assert.equal(verify.calls[0].minLeafCount, 0);
  });

  for (const bad of ["-1", "1.5", "1e3", "9007199254740992"]) {
    it(`rejects --min-leaf-count ${bad} before running verify`, async () => {
      const verify = captureVerify(makeReport(true));
      const stderr = fakeStream();
      const code = await main({
        argv: ["--min-leaf-count", bad],
        env: {},
        verify,
        stdout: fakeStream(),
        stderr,
      });
      assert.equal(code, 1);
      assert.equal(verify.calls.length, 0);
      assert.match(stderr.text(), /--min-leaf-count/);
    });
  }

  for (const bad of ["0", "-1", "1.5", "1e3", "9007199254740992"]) {
    it(`rejects --timeout-ms ${bad} before running verify`, async () => {
      const verify = captureVerify(makeReport(true));
      const stderr = fakeStream();
      const code = await main({
        argv: ["--timeout-ms", bad],
        env: {},
        verify,
        stdout: fakeStream(),
        stderr,
      });
      assert.equal(code, 1);
      assert.equal(verify.calls.length, 0);
      assert.match(stderr.text(), /--timeout-ms/);
    });
  }

  it("accepts a positive safe --timeout-ms", async () => {
    const verify = captureVerify(makeReport(true));
    const code = await main({
      argv: ["--timeout-ms", "500"],
      env: {},
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });
    assert.equal(code, 0);
    assert.equal(verify.calls[0].timeoutMs, 500);
  });
});

describe("origin normalization and validation", () => {
  it("normalizes a trailing-slash canonical origin and derives a single-slash root sitemap", async () => {
    const verify = captureVerify(makeReport(true));
    await main({
      argv: [],
      env: { INDEXABILITY_CANONICAL_ORIGIN: "https://c.example/" },
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });
    const options = verify.calls[0];
    assert.equal(options.canonicalOrigin, "https://c.example");
    assert.equal(options.rootSitemapUrl, "https://c.example/sitemap_index.xml");
  });

  it("rejects a path-bearing canonical origin without running verify", async () => {
    const verify = captureVerify(makeReport(true));
    const code = await main({
      argv: ["--canonical-origin=https://c.example/foo"],
      env: {},
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });
    assert.equal(code, 1);
    assert.equal(verify.calls.length, 0);
  });

  it("rejects a non-http origin scheme without running verify", async () => {
    const verify = captureVerify(makeReport(true));
    const code = await main({
      argv: ["--apex-origin=ftp://c.example"],
      env: {},
      verify,
      stdout: fakeStream(),
      stderr: fakeStream(),
    });
    assert.equal(code, 1);
    assert.equal(verify.calls.length, 0);
  });
});
