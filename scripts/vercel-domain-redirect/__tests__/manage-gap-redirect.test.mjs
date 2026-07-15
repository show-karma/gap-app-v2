import assert from "node:assert/strict";
import { describe, it } from "node:test";
// Pins the CLI contract for inspecting / clearing / restoring the Vercel
// project-domain redirect on gap.karmahq.xyz via the v9 project-domain GET/PATCH
// endpoints, with identity/verified guards, exact state validation, a real
// request timeout, auto-rollback, and absolute token redaction.
import { main, makeRedactor, parseArgs } from "../manage-gap-redirect.mjs";

// ---------------------------------------------------------------------------
// Fixtures + injectable seams (no real network / fs).
// ---------------------------------------------------------------------------

const ENV = Object.freeze({
  VERCEL_TOKEN: "tok_secret_ABC123",
  VERCEL_PROJECT_ID: "prj_abc",
  VERCEL_ORG_ID: "team_xyz",
});

const API = "https://api.vercel.com/";
const ENDPOINT =
  "https://api.vercel.com/v9/projects/prj_abc/domains/gap.karmahq.xyz?teamId=team_xyz";
const PROBE_URL = "https://gap.karmahq.xyz/project/paraswap/grants";
const EXPECTED_LOCATION = "https://www.karmahq.xyz/project/paraswap/funding";
const WRONG_LOCATION = "https://www.karmahq.xyz/project/paraswap/grants"; // the 2-hop first stop

const REDIRECTING = Object.freeze({
  name: "gap.karmahq.xyz",
  apexName: "karmahq.xyz",
  projectId: "prj_abc",
  redirect: "www.karmahq.xyz",
  redirectStatusCode: 301,
  gitBranch: null,
  verified: true,
});
const CLEARED = Object.freeze({ ...REDIRECTING, redirect: null, redirectStatusCode: null });

function apiResponse(body, { status = 200, malformed = false } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (n) => (n.toLowerCase() === "content-type" ? "application/json" : null) },
    json: async () => {
      if (malformed) throw new Error("Unexpected token < in JSON");
      return body;
    },
    text: async () => (malformed ? "<html>" : JSON.stringify(body)),
  };
}

function redirectResponse(location, status = 308) {
  return {
    status,
    ok: false,
    headers: { get: (n) => (n.toLowerCase() === "location" ? location : null) },
    json: async () => {
      throw new Error("no json on redirect");
    },
    text: async () => "",
  };
}

// A response whose body read (.json) never settles until the request is aborted.
function stalledJson(signal) {
  return {
    status: 200,
    ok: true,
    headers: { get: (n) => (n.toLowerCase() === "content-type" ? "application/json" : null) },
    json: () =>
      new Promise((_, reject) =>
        signal?.addEventListener("abort", () => reject(new Error("aborted")))
      ),
    text: async () => "",
  };
}

// Records every call; dispatches to a per-test responder that receives a
// normalized call object { url, method, headers, redirect, body, signal }.
function recordingFetch(responder) {
  const calls = [];
  const impl = async (url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const call = {
      url: String(url),
      method,
      headers: options.headers || {},
      redirect: options.redirect,
      body: typeof options.body === "string" ? JSON.parse(options.body) : undefined,
      signal: options.signal,
    };
    calls.push(call);
    return responder(call);
  };
  impl.calls = calls;
  return impl;
}

// Sequenced API responder: one GET body, successive PATCH responses, a probe.
function apiFetch({ get = REDIRECTING, patches = [apiResponse(CLEARED)], probe } = {}) {
  let patchIndex = 0;
  return recordingFetch((call) => {
    if (call.url.startsWith(API)) {
      if (call.method === "GET") return typeof get === "function" ? get(call) : apiResponse(get);
      const response = patches[patchIndex] ?? patches[patches.length - 1];
      patchIndex += 1;
      return response;
    }
    return probe ?? redirectResponse(EXPECTED_LOCATION, 308);
  });
}

function fakeStream() {
  const chunks = [];
  return {
    write: (str) => {
      chunks.push(String(str));
      return true;
    },
    text: () => chunks.join(""),
  };
}

function fakeWriteFile() {
  const files = {};
  const fn = async (path, data) => {
    files[String(path)] = String(data);
  };
  fn.files = files;
  return fn;
}

function run(argv, { env = ENV, fetch, writeFile = fakeWriteFile(), timeoutMs } = {}) {
  const stdout = fakeStream();
  const stderr = fakeStream();
  const mkdir = async () => {};
  return main({ argv, env, fetch, writeFile, mkdir, stdout, stderr, timeoutMs }).then((code) => ({
    code,
    out: stdout.text(),
    err: stderr.text(),
    files: writeFile.files,
    calls: fetch?.calls ?? [],
  }));
}

const patchCalls = (calls) => calls.filter((c) => c.method === "PATCH");
const getCalls = (calls) => calls.filter((c) => c.method === "GET" && c.url.startsWith(API));
const authOf = (call) => call.headers.authorization ?? call.headers.Authorization;
const APPLY_OK = ["--mode", "apply", "--confirm", "CLEAR gap.karmahq.xyz"];
const ROLLBACK_OK = [
  "--mode",
  "rollback",
  "--confirm",
  "RESTORE gap.karmahq.xyz -> www.karmahq.xyz",
];

// ---------------------------------------------------------------------------
// parseArgs + redactor
// ---------------------------------------------------------------------------

describe("parseArgs", () => {
  it("parses mode, confirm, and artifact paths", () => {
    const flags = parseArgs([
      "--mode",
      "apply",
      "--confirm",
      "CLEAR gap.karmahq.xyz",
      "--report",
      "/art/r.json",
      "--rollback-state",
      "/art/s.json",
    ]);
    assert.deepEqual(flags, {
      mode: "apply",
      confirm: "CLEAR gap.karmahq.xyz",
      report: "/art/r.json",
      rollbackState: "/art/s.json",
    });
  });
  it("rejects an unknown flag", () => {
    assert.throws(() => parseArgs(["--nope", "x"]), /unknown/i);
  });
});

describe("makeRedactor", () => {
  it("masks the token wherever it appears", () => {
    assert.equal(makeRedactor("tok_secret_ABC123")("a tok_secret_ABC123 b"), "a [REDACTED] b");
  });
  it("is a no-op passthrough when no token is set", () => {
    assert.equal(makeRedactor(undefined)("plain text"), "plain text");
  });
});

// ---------------------------------------------------------------------------
// inspect
// ---------------------------------------------------------------------------

describe("inspect", () => {
  it("reports the current domain config and never mutates", async () => {
    const fetch = apiFetch({ get: REDIRECTING });
    const r = await run(["--mode", "inspect", "--report", "/art/report.json"], { fetch });
    assert.equal(r.code, 0);
    assert.equal(patchCalls(r.calls).length, 0);
    assert.match(r.out, /gap\.karmahq\.xyz/);
    assert.match(r.out, /www\.karmahq\.xyz/);
    assert.match(r.out, /301/);
    assert.ok(r.files["/art/report.json"]);
  });

  it("targets the exact v9 endpoint with an encoded teamId and a Bearer token", async () => {
    const fetch = apiFetch({ get: REDIRECTING });
    const r = await run(["--mode", "inspect"], { fetch });
    const get = getCalls(r.calls)[0];
    assert.equal(get.url, ENDPOINT);
    assert.equal(authOf(get), "Bearer tok_secret_ABC123");
  });

  it("percent-encodes project id and team id that contain special characters", async () => {
    const fetch = apiFetch({ get: REDIRECTING });
    const r = await run(["--mode", "inspect"], {
      env: { ...ENV, VERCEL_PROJECT_ID: "prj/a b#c", VERCEL_ORG_ID: "team x/y?z" },
      fetch,
    });
    const get = getCalls(r.calls)[0];
    assert.equal(
      get.url,
      "https://api.vercel.com/v9/projects/prj%2Fa%20b%23c/domains/gap.karmahq.xyz?teamId=team%20x%2Fy%3Fz"
    );
  });

  it("fails on a domain/project identity mismatch", async () => {
    const fetch = apiFetch({ get: { ...REDIRECTING, projectId: "prj_other" } });
    const r = await run(["--mode", "inspect"], { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
  });

  it("fails without required secrets and makes no request", async () => {
    const fetch = apiFetch({ get: REDIRECTING });
    const r = await run(["--mode", "inspect"], {
      env: { VERCEL_PROJECT_ID: "prj_abc", VERCEL_ORG_ID: "team_xyz" },
      fetch,
    });
    assert.equal(r.code, 1);
    assert.equal(r.calls.length, 0);
    assert.match(r.err, /VERCEL_TOKEN/);
  });
});

// ---------------------------------------------------------------------------
// apply — guards (no mutation)
// ---------------------------------------------------------------------------

describe("apply — guards (no mutation)", () => {
  it("refuses without the exact confirmation and makes no request", async () => {
    const fetch = apiFetch({ get: REDIRECTING });
    const r = await run(["--mode", "apply", "--confirm", "clear gap"], { fetch });
    assert.equal(r.code, 1);
    assert.equal(r.calls.length, 0);
    assert.match(r.err, /confirm/i);
  });

  it("writes a failure report on a wrong confirmation when --report is supplied", async () => {
    const fetch = apiFetch({ get: REDIRECTING });
    const r = await run(["--mode", "apply", "--confirm", "nope", "--report", "/art/report.json"], {
      fetch,
    });
    assert.equal(r.code, 1);
    assert.equal(r.calls.length, 0);
    const report = JSON.parse(r.files["/art/report.json"]);
    assert.equal(report.ok, false);
  });

  it("refuses when the current redirect is not the expected www 301 — no PATCH", async () => {
    const fetch = apiFetch({
      get: { ...REDIRECTING, redirect: "other.example", redirectStatusCode: 302 },
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
    assert.match(r.err, /precondition|unexpected/i);
  });

  it("refuses on a domain/project identity mismatch — no PATCH", async () => {
    const fetch = apiFetch({ get: { ...REDIRECTING, projectId: "prj_other" } });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
  });

  it("refuses to mutate an unverified domain — no PATCH", async () => {
    const fetch = apiFetch({ get: { ...REDIRECTING, verified: false } });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
    assert.match(r.err, /verified/i);
  });

  it("refuses on a malformed GET response — no PATCH", async () => {
    const fetch = recordingFetch((call) =>
      call.method === "GET" ? apiResponse(null, { malformed: true }) : apiResponse(CLEARED)
    );
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
  });
});

// ---------------------------------------------------------------------------
// apply — success + PATCH request shape
// ---------------------------------------------------------------------------

describe("apply — success", () => {
  it("clears the redirect, captures rollback state, and validates a single-hop probe", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse(CLEARED)],
      probe: redirectResponse(EXPECTED_LOCATION, 308),
    });
    const r = await run(
      [...APPLY_OK, "--report", "/art/report.json", "--rollback-state", "/art/rollback.json"],
      { fetch }
    );

    assert.equal(r.code, 0);
    const patch = patchCalls(r.calls);
    assert.equal(patch.length, 1);
    assert.equal(patch[0].url, ENDPOINT);
    assert.equal(authOf(patch[0]), "Bearer tok_secret_ABC123");
    assert.equal(
      patch[0].headers["content-type"] ?? patch[0].headers["Content-Type"],
      "application/json"
    );
    assert.deepEqual(patch[0].body, { redirect: null, redirectStatusCode: null });
    assert.deepEqual(JSON.parse(r.files["/art/rollback.json"]), {
      redirect: "www.karmahq.xyz",
      redirectStatusCode: 301,
      gitBranch: null,
    });
    assert.ok(r.files["/art/report.json"]);
  });

  it("sends the probe with manual redirect handling to the grants URL", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse(CLEARED)],
      probe: redirectResponse(EXPECTED_LOCATION, 301),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 0);
    const probe = r.calls.find((c) => c.url === PROBE_URL);
    assert.equal(probe.redirect, "manual");
  });
});

// ---------------------------------------------------------------------------
// apply — auto-rollback on any post-mutation failure
// ---------------------------------------------------------------------------

describe("apply — auto-rollback", () => {
  it("rolls back when the probe is a wrong-target single hop (2-hop chain)", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse(CLEARED), apiResponse(REDIRECTING)],
      probe: redirectResponse(WRONG_LOCATION, 301),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    const patch = patchCalls(r.calls);
    assert.equal(patch.length, 2);
    assert.deepEqual(patch[0].body, { redirect: null, redirectStatusCode: null });
    assert.deepEqual(patch[1].body, {
      redirect: "www.karmahq.xyz",
      redirectStatusCode: 301,
      gitBranch: null,
    });
    assert.equal(authOf(patch[1]), "Bearer tok_secret_ABC123");
    assert.match(r.err, /rolled back/i);
  });

  it("rolls back when the clear PATCH response is not actually cleared", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse(REDIRECTING), apiResponse(REDIRECTING)],
      probe: redirectResponse(EXPECTED_LOCATION, 308),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 2);
  });

  it("rolls back when the clear PATCH response is for the wrong project", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse({ ...CLEARED, projectId: "prj_other" }), apiResponse(REDIRECTING)],
      probe: redirectResponse(EXPECTED_LOCATION, 308),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 2);
    assert.match(r.err, /rolled back/i);
  });

  it("rolls back when the clear PATCH response changed gitBranch", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse({ ...CLEARED, gitBranch: "surprise" }), apiResponse(REDIRECTING)],
      probe: redirectResponse(EXPECTED_LOCATION, 308),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 2);
  });

  it("reports rollback failure when a 200 rollback response did not restore the captured state", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse(CLEARED), apiResponse(CLEARED)],
      probe: redirectResponse(WRONG_LOCATION, 301),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 2);
    assert.match(r.err, /rollback (also )?failed|did not restore/i);
  });

  it("reports both primary and rollback errors when the rollback PATCH errors (500)", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse(CLEARED), apiResponse({ error: { message: "boom" } }, { status: 500 })],
      probe: redirectResponse(WRONG_LOCATION, 301),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 2);
    assert.match(r.err, /rollback (also )?failed|failed to roll back/i);
  });
});

// ---------------------------------------------------------------------------
// apply — already-clear idempotency
// ---------------------------------------------------------------------------

describe("apply — already clear", () => {
  it("succeeds idempotently without mutating when already clear and the probe passes", async () => {
    const fetch = apiFetch({ get: CLEARED, probe: redirectResponse(EXPECTED_LOCATION, 308) });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 0);
    assert.equal(patchCalls(r.calls).length, 0);
    assert.match(r.out, /idempotent|already/i);
  });

  it("fails without mutating when already clear but the probe does not single-hop", async () => {
    const fetch = apiFetch({ get: CLEARED, probe: redirectResponse(WRONG_LOCATION, 301) });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
  });
});

// ---------------------------------------------------------------------------
// apply — request timeout (real timer, injectable for fast tests)
// ---------------------------------------------------------------------------

describe("timeout", () => {
  it(
    "aborts a stalled Vercel response body and exits 1 without hanging",
    { timeout: 3000 },
    async () => {
      const fetch = recordingFetch((call) =>
        call.url.startsWith(API)
          ? stalledJson(call.signal)
          : redirectResponse(EXPECTED_LOCATION, 308)
      );
      const r = await run(["--mode", "inspect"], { fetch, timeoutMs: 25 });
      assert.equal(r.code, 1);
    }
  );

  it(
    "aborts a stalled probe after clearing and auto-rolls back without hanging",
    { timeout: 3000 },
    async () => {
      let patchN = 0;
      const fetch = recordingFetch((call) => {
        if (call.url.startsWith(API)) {
          if (call.method === "GET") return apiResponse(REDIRECTING);
          patchN += 1;
          return apiResponse(patchN === 1 ? CLEARED : REDIRECTING);
        }
        // probe never settles until aborted
        return new Promise((_, reject) =>
          call.signal?.addEventListener("abort", () => reject(new Error("aborted")))
        );
      });
      const r = await run(APPLY_OK, { fetch, timeoutMs: 25 });
      assert.equal(r.code, 1);
      assert.equal(patchCalls(r.calls).length, 2);
      assert.match(r.err, /rolled back/i);
    }
  );
});

// ---------------------------------------------------------------------------
// rollback (manual) — GET-first, only from the exact cleared state
// ---------------------------------------------------------------------------

describe("rollback", () => {
  it("refuses without the exact confirmation — no PATCH", async () => {
    const fetch = apiFetch({ get: CLEARED });
    const r = await run(["--mode", "rollback", "--confirm", "RESTORE gap"], { fetch });
    assert.equal(r.code, 1);
    assert.equal(r.calls.length, 0);
  });

  it("writes a failure report on a wrong confirmation when --report is supplied", async () => {
    const fetch = apiFetch({ get: CLEARED });
    const r = await run(["--mode", "rollback", "--confirm", "no", "--report", "/art/report.json"], {
      fetch,
    });
    assert.equal(r.code, 1);
    assert.equal(JSON.parse(r.files["/art/report.json"]).ok, false);
  });

  it("restores www 301 from the cleared state and validates the PATCH response", async () => {
    const fetch = apiFetch({ get: CLEARED, patches: [apiResponse(REDIRECTING)] });
    const r = await run([...ROLLBACK_OK, "--report", "/art/report.json"], { fetch });
    assert.equal(r.code, 0);
    const patch = patchCalls(r.calls);
    assert.equal(patch.length, 1);
    assert.equal(patch[0].url, ENDPOINT);
    assert.equal(authOf(patch[0]), "Bearer tok_secret_ABC123");
    assert.deepEqual(patch[0].body, { redirect: "www.karmahq.xyz", redirectStatusCode: 301 });
  });

  it("succeeds idempotently with no PATCH when already restored to www 301", async () => {
    const fetch = apiFetch({ get: REDIRECTING });
    const r = await run(ROLLBACK_OK, { fetch });
    assert.equal(r.code, 0);
    assert.equal(patchCalls(r.calls).length, 0);
    assert.match(r.out, /already|idempotent/i);
  });

  it("refuses to restore from an unexpected (non-cleared) state — no PATCH", async () => {
    const fetch = apiFetch({
      get: { ...REDIRECTING, redirect: "other.example", redirectStatusCode: 302 },
    });
    const r = await run(ROLLBACK_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
  });

  it("refuses on identity mismatch — no PATCH", async () => {
    const fetch = apiFetch({ get: { ...CLEARED, projectId: "prj_other" } });
    const r = await run(ROLLBACK_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
  });

  it("refuses to mutate an unverified domain — no PATCH", async () => {
    const fetch = apiFetch({ get: { ...CLEARED, verified: false } });
    const r = await run(ROLLBACK_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
    assert.match(r.err, /verified/i);
  });

  it("fails when the restore PATCH response did not restore www 301", async () => {
    const fetch = apiFetch({ get: CLEARED, patches: [apiResponse(CLEARED)] });
    const r = await run(ROLLBACK_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 1);
  });
});

// ---------------------------------------------------------------------------
// token redaction
// ---------------------------------------------------------------------------

describe("token redaction", () => {
  it("never prints the token, even when an underlying error message contains it", async () => {
    const fetch = recordingFetch(() => {
      throw new Error(`network exploded for Bearer ${ENV.VERCEL_TOKEN}`);
    });
    const r = await run(["--mode", "inspect"], { fetch });
    assert.equal(r.code, 1);
    assert.ok(!r.out.includes(ENV.VERCEL_TOKEN));
    assert.ok(!r.err.includes(ENV.VERCEL_TOKEN));
  });

  it("does not leak the token across a full successful apply run (logs + artifacts)", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse(CLEARED)],
      probe: redirectResponse(EXPECTED_LOCATION, 308),
    });
    const r = await run(
      [...APPLY_OK, "--report", "/art/report.json", "--rollback-state", "/art/rollback.json"],
      { fetch }
    );
    assert.equal(r.code, 0);
    const everything = r.out + r.err + Object.values(r.files).join("");
    assert.ok(!everything.includes(ENV.VERCEL_TOKEN));
  });
});

// ---------------------------------------------------------------------------
// mutation PATCH responses must be identity- AND verified-checked
// ---------------------------------------------------------------------------

describe("mutation PATCH verified guard", () => {
  it("(a) rolls back when the clear PATCH response is not verified", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse({ ...CLEARED, verified: false }), apiResponse(REDIRECTING)],
      probe: redirectResponse(EXPECTED_LOCATION, 308),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 2);
    assert.match(r.err, /rolled back/i);
  });

  it("(b) reports rollback failure when the rollback response matches captured state but is not verified", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse(CLEARED), apiResponse({ ...REDIRECTING, verified: false })],
      probe: redirectResponse(WRONG_LOCATION, 301),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 2);
    assert.match(r.err, /rollback (also )?failed|not verified/i);
  });

  it("(c) fails when the manual restore PATCH response is not verified", async () => {
    const fetch = apiFetch({
      get: CLEARED,
      patches: [apiResponse({ ...REDIRECTING, verified: false })],
    });
    const r = await run(ROLLBACK_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 1);
    assert.match(r.err, /verified/i);
  });
});

// ---------------------------------------------------------------------------
// verified must be the literal boolean true (fail closed on non-boolean)
// ---------------------------------------------------------------------------

describe("strict verified boolean", () => {
  it("refuses to mutate when the GET payload verified is the string 'false' — no PATCH", async () => {
    const fetch = apiFetch({ get: { ...REDIRECTING, verified: "false" } });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 0);
    assert.match(r.err, /verified/i);
  });

  it("rolls back when the clear PATCH response verified is the string 'true'", async () => {
    const fetch = apiFetch({
      get: REDIRECTING,
      patches: [apiResponse({ ...CLEARED, verified: "true" }), apiResponse(REDIRECTING)],
      probe: redirectResponse(EXPECTED_LOCATION, 308),
    });
    const r = await run(APPLY_OK, { fetch });
    assert.equal(r.code, 1);
    assert.equal(patchCalls(r.calls).length, 2);
    assert.match(r.err, /rolled back/i);
  });
});
