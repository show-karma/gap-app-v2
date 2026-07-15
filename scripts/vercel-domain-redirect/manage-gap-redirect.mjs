/**
 * Import-safe, dependency-free CLI to inspect / clear / restore the Vercel
 * project-domain redirect on gap.karmahq.xyz. Running the file directly executes
 * the requested mode; importing it (e.g. from tests) only exposes
 * parseArgs/makeRedactor/main without side effects.
 *
 * Why this exists: gap.karmahq.xyz currently carries a Vercel project-domain
 * redirect (301 -> www.karmahq.xyz) that fires at the edge BEFORE the Next.js
 * middleware runs. For /project/<slug>/grants that produces a two-hop chain
 * (301 host-swap, then a 308 grants->funding). Clearing the domain redirect lets
 * the app serve gap.karmahq.xyz, and the middleware collapses host-swap +
 * grants->funding into a single 308 to www/.../funding. This tool performs that
 * change safely, with strict identity/verified guards, exact state validation, a
 * real request timeout, a live single-hop postcondition, and automatic rollback.
 *
 * Every API response (inspect, apply, auto-rollback, manual rollback) is checked
 * for the exact domain + project identity; the mutating modes additionally
 * require verified=true. The Vercel API token is never printed: all
 * stdout/stderr/artifact writes pass through a redactor that masks the token.
 */
import { mkdir as fsMkdir, writeFile as fsWriteFile } from "node:fs/promises";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";

const API_BASE = "https://api.vercel.com";
const DOMAIN = "gap.karmahq.xyz";
const TARGET_HOST = "www.karmahq.xyz";
const RESTORE_STATUS = 301;
const PROBE_URL = "https://gap.karmahq.xyz/project/paraswap/grants";
const EXPECTED_LOCATION = "https://www.karmahq.xyz/project/paraswap/funding";
const CONFIRM_APPLY = "CLEAR gap.karmahq.xyz";
const CONFIRM_ROLLBACK = "RESTORE gap.karmahq.xyz -> www.karmahq.xyz";
const PERMANENT_REDIRECT_STATUSES = new Set([301, 308]);
const MODES = new Set(["inspect", "apply", "rollback"]);
const DEFAULT_TIMEOUT_MS = 15000;

const FLAG_TO_KEY = Object.freeze({
  "--mode": "mode",
  "--confirm": "confirm",
  "--report": "report",
  "--rollback-state": "rollbackState",
});

/** Build a function that masks the Vercel token anywhere it appears. */
export function makeRedactor(token) {
  return (value) => (token ? String(value).split(token).join("[REDACTED]") : String(value));
}

/**
 * Parse argv into a flags object. Throws on unknown flags and missing values.
 * Accepts both `--flag value` and `--flag=value` forms.
 */
export function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    let name = token;
    let value;

    const eq = token.startsWith("--") ? token.indexOf("=") : -1;
    if (eq !== -1) {
      name = token.slice(0, eq);
      value = token.slice(eq + 1);
    }

    if (!Object.hasOwn(FLAG_TO_KEY, name)) {
      throw new Error(`Unknown argument: ${token}`);
    }

    if (value === undefined) {
      const next = argv[index + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`Missing value for ${name}`);
      }
      value = next;
      index += 1;
    }

    flags[FLAG_TO_KEY[name]] = value;
  }
  return flags;
}

/**
 * Run the CLI. Injectable (fetch/writeFile/mkdir/stdout/stderr/timeoutMs) for
 * tests. Returns 0 on success, 1 otherwise — never calls process.exit.
 */
export async function main({
  argv = [],
  env = {},
  fetch = globalThis.fetch,
  writeFile = fsWriteFile,
  mkdir = fsMkdir,
  stdout = process.stdout,
  stderr = process.stderr,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  let flags;
  try {
    flags = parseArgs(argv);
  } catch (err) {
    stderr.write(`Error: ${errMsg(err)}\n`);
    return 1;
  }

  const token = env.VERCEL_TOKEN;
  const projectId = env.VERCEL_PROJECT_ID;
  const teamId = env.VERCEL_ORG_ID;

  const redact = makeRedactor(token);
  const log = (line) => stdout.write(`${redact(line)}\n`);
  const error = (line) => stderr.write(`Error: ${redact(line)}\n`);

  const missing = [];
  if (!token) missing.push("VERCEL_TOKEN");
  if (!projectId) missing.push("VERCEL_PROJECT_ID");
  if (!teamId) missing.push("VERCEL_ORG_ID");
  if (missing.length > 0) {
    error(`missing required environment: ${missing.join(", ")}`);
    return 1;
  }

  if (!MODES.has(flags.mode)) {
    error(`unknown mode: ${flags.mode ?? "(none)"} (expected inspect|apply|rollback)`);
    return 1;
  }

  const ctx = {
    fetch,
    writeFile,
    mkdir,
    token,
    projectId,
    teamId,
    endpoint: domainEndpoint(projectId, teamId),
    confirm: flags.confirm,
    flags,
    timeoutMs,
    log,
    error,
    redact,
  };

  try {
    if (flags.mode === "inspect") return await runInspect(ctx);
    if (flags.mode === "apply") return await runApply(ctx);
    return await runRollback(ctx);
  } catch (err) {
    error(errMsg(err));
    try {
      await writeReport(ctx, { mode: flags.mode, ok: false, error: errMsg(err) });
    } catch {
      // Ignore secondary failures while handling the primary error.
    }
    return 1;
  }
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

async function runInspect(ctx) {
  const summary = pickSummary(assertIdentity(await apiGet(ctx), ctx));
  ctx.log(`Domain: ${summary.name} (project ${summary.projectId})`);
  ctx.log(
    `Redirect: ${summary.redirect ?? "(none)"} status ${summary.redirectStatusCode ?? "(none)"}`
  );
  ctx.log(`gitBranch: ${summary.gitBranch ?? "(none)"} | verified: ${summary.verified}`);
  await writeReport(ctx, { mode: "inspect", ok: true, domain: summary });
  return 0;
}

async function runApply(ctx) {
  if (ctx.confirm !== CONFIRM_APPLY) {
    ctx.error(`apply requires the exact confirmation "${CONFIRM_APPLY}"`);
    await writeReport(ctx, { mode: "apply", ok: false, error: "invalid or missing confirmation" });
    return 1;
  }

  const current = pickSummary(assertIdentity(await apiGet(ctx), ctx));
  if (current.verified !== true) {
    ctx.error("domain is not verified (verified=false); refusing to mutate");
    await writeReport(ctx, { mode: "apply", ok: false, mutated: false, current });
    return 1;
  }

  const alreadyClear = current.redirect == null && current.redirectStatusCode == null;
  if (alreadyClear) {
    const probe = await probeSingleHop(ctx);
    if (probe.ok) {
      ctx.log(
        "Redirect already cleared and the probe confirms a single hop to funding — idempotent, no mutation."
      );
      await writeReport(ctx, { mode: "apply", ok: true, mutated: false, idempotent: true, probe });
      return 0;
    }
    ctx.error(`redirect already cleared but the probe did not single-hop: ${probe.reason}`);
    await writeReport(ctx, { mode: "apply", ok: false, mutated: false, probe });
    return 1;
  }

  if (current.redirect !== TARGET_HOST || current.redirectStatusCode !== RESTORE_STATUS) {
    ctx.error(
      `precondition failed: expected redirect ${TARGET_HOST} status ${RESTORE_STATUS}, ` +
        `found ${current.redirect} status ${current.redirectStatusCode} — no mutation`
    );
    await writeReport(ctx, { mode: "apply", ok: false, mutated: false, current });
    return 1;
  }

  // Capture rollback state BEFORE any mutation.
  const rollbackState = {
    redirect: current.redirect,
    redirectStatusCode: current.redirectStatusCode,
    gitBranch: current.gitBranch,
  };
  await writeRollbackState(ctx, rollbackState);

  let primaryError = null;
  try {
    const patched = pickSummary(
      assertMutationResult(await apiPatch(ctx, { redirect: null, redirectStatusCode: null }), ctx)
    );
    if (patched.redirect != null || patched.redirectStatusCode != null) {
      primaryError = `clear PATCH response still shows redirect ${patched.redirect} status ${patched.redirectStatusCode}`;
    } else if (patched.gitBranch !== rollbackState.gitBranch) {
      primaryError = `clear PATCH changed gitBranch from ${rollbackState.gitBranch} to ${patched.gitBranch}`;
    } else {
      const probe = await probeSingleHop(ctx);
      if (probe.ok) {
        ctx.log(
          "Redirect cleared; probe confirms a single 30x hop to www/project/paraswap/funding."
        );
        await writeReport(ctx, { mode: "apply", ok: true, mutated: true, probe });
        return 0;
      }
      primaryError = probe.reason;
    }
  } catch (err) {
    primaryError = errMsg(err);
  }

  return autoRollback(ctx, rollbackState, primaryError);
}

async function autoRollback(ctx, rollbackState, primaryError) {
  ctx.error(`apply failed after mutation: ${primaryError}`);
  try {
    const restored = pickSummary(
      assertMutationResult(
        await apiPatch(ctx, {
          redirect: rollbackState.redirect,
          redirectStatusCode: rollbackState.redirectStatusCode,
          gitBranch: rollbackState.gitBranch,
        }),
        ctx
      )
    );
    if (
      restored.redirect !== rollbackState.redirect ||
      restored.redirectStatusCode !== rollbackState.redirectStatusCode ||
      restored.gitBranch !== rollbackState.gitBranch
    ) {
      throw new Error(
        `rollback PATCH response did not restore the captured state ` +
          `(redirect ${restored.redirect}, status ${restored.redirectStatusCode}, gitBranch ${restored.gitBranch})`
      );
    }
    ctx.error("Rolled back to the previous redirect state.");
    await writeReport(ctx, {
      mode: "apply",
      ok: false,
      mutated: true,
      rolledBack: true,
      primaryError,
    });
    return 1;
  } catch (rollbackErr) {
    const rollbackError = errMsg(rollbackErr);
    ctx.error(`Rollback also failed: ${rollbackError}. Manual intervention required.`);
    await writeReport(ctx, {
      mode: "apply",
      ok: false,
      mutated: true,
      rolledBack: false,
      primaryError,
      rollbackError,
    });
    return 1;
  }
}

async function runRollback(ctx) {
  if (ctx.confirm !== CONFIRM_ROLLBACK) {
    ctx.error(`rollback requires the exact confirmation "${CONFIRM_ROLLBACK}"`);
    await writeReport(ctx, {
      mode: "rollback",
      ok: false,
      error: "invalid or missing confirmation",
    });
    return 1;
  }

  const current = pickSummary(assertIdentity(await apiGet(ctx), ctx));

  // Already restored — idempotent success, no mutation.
  if (current.redirect === TARGET_HOST && current.redirectStatusCode === RESTORE_STATUS) {
    if (current.verified !== true) {
      ctx.error("domain is not verified (verified=false); refusing");
      await writeReport(ctx, { mode: "rollback", ok: false, mutated: false, current });
      return 1;
    }
    ctx.log(
      `Redirect already restored to ${TARGET_HOST} ${RESTORE_STATUS} — idempotent, no mutation.`
    );
    await writeReport(ctx, { mode: "rollback", ok: true, mutated: false, idempotent: true });
    return 0;
  }

  // Only restore from the exact cleared state.
  const cleared = current.redirect == null && current.redirectStatusCode == null;
  if (!cleared) {
    ctx.error(
      `refusing to restore from an unexpected state: redirect ${current.redirect} status ${current.redirectStatusCode} — no mutation`
    );
    await writeReport(ctx, { mode: "rollback", ok: false, mutated: false, current });
    return 1;
  }
  if (current.verified !== true) {
    ctx.error("domain is not verified (verified=false); refusing to mutate");
    await writeReport(ctx, { mode: "rollback", ok: false, mutated: false, current });
    return 1;
  }

  const restored = pickSummary(
    assertMutationResult(
      await apiPatch(ctx, { redirect: TARGET_HOST, redirectStatusCode: RESTORE_STATUS }),
      ctx
    )
  );
  if (restored.redirect !== TARGET_HOST || restored.redirectStatusCode !== RESTORE_STATUS) {
    ctx.error(
      `rollback PATCH did not restore ${TARGET_HOST} ${RESTORE_STATUS}: ${restored.redirect} ${restored.redirectStatusCode}`
    );
    await writeReport(ctx, { mode: "rollback", ok: false, mutated: true, restored });
    return 1;
  }
  ctx.log(`Restored the ${TARGET_HOST} ${RESTORE_STATUS} redirect on ${DOMAIN}.`);
  await writeReport(ctx, { mode: "rollback", ok: true, mutated: true, restored });
  return 0;
}

// ---------------------------------------------------------------------------
// Vercel v9 project-domain API (timeout stays armed through body consumption)
// ---------------------------------------------------------------------------

function domainEndpoint(projectId, teamId) {
  return (
    `${API_BASE}/v9/projects/${encodeURIComponent(projectId)}` +
    `/domains/${encodeURIComponent(DOMAIN)}?teamId=${encodeURIComponent(teamId)}`
  );
}

async function apiGet(ctx) {
  return timedFetch(ctx.fetch, ctx.endpoint, {
    timeoutMs: ctx.timeoutMs,
    init: { method: "GET", headers: { authorization: `Bearer ${ctx.token}` } },
    consume: parseApiDomain,
  });
}

async function apiPatch(ctx, body) {
  return timedFetch(ctx.fetch, ctx.endpoint, {
    timeoutMs: ctx.timeoutMs,
    init: {
      method: "PATCH",
      headers: { authorization: `Bearer ${ctx.token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    consume: parseApiDomain,
  });
}

/**
 * One AbortController + one timer per request. The optional `consume` callback
 * reads the response body WHILE the timer is still armed, so a stalled body
 * aborts under the same timeout instead of hanging after the timer is cleared.
 */
async function timedFetch(fetch, url, { timeoutMs, init = {}, consume } = {}) {
  const controller = new AbortController();
  const timer =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return consume ? await consume(response) : response;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function parseApiDomain(response) {
  if (!response || typeof response.status !== "number") {
    throw new Error("no response from the Vercel API");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`malformed or unreadable body from the Vercel API (status ${response.status})`);
  }
  if (response.status < 200 || response.status >= 300) {
    const detail = data?.error?.message ? `: ${data.error.message}` : "";
    throw new Error(`Vercel API returned status ${response.status}${detail}`);
  }
  if (
    !data ||
    typeof data !== "object" ||
    typeof data.name !== "string" ||
    typeof data.projectId !== "string"
  ) {
    throw new Error("unexpected domain payload from the Vercel API");
  }
  return data;
}

function assertIdentity(domain, ctx) {
  if (domain.name !== DOMAIN) {
    throw new Error(`domain identity mismatch: expected ${DOMAIN}, got ${domain.name}`);
  }
  if (domain.projectId !== ctx.projectId) {
    throw new Error(
      `project mismatch: domain belongs to ${domain.projectId}, expected ${ctx.projectId}`
    );
  }
  return domain;
}

/**
 * The single gate every mutation PATCH response passes before any success /
 * rolledBack result: exact domain + project identity AND verified===true. A
 * PATCH that lands the domain in an unverified state is a failed mutation even
 * if the redirect fields look right.
 */
function assertMutationResult(domain, ctx) {
  assertIdentity(domain, ctx);
  if (domain.verified !== true) {
    throw new Error("mutation PATCH response is not verified (verified !== true)");
  }
  return domain;
}

function pickSummary(domain) {
  return {
    name: domain.name,
    apexName: domain.apexName ?? null,
    projectId: domain.projectId,
    redirect: domain.redirect ?? null,
    redirectStatusCode: domain.redirectStatusCode ?? null,
    gitBranch: domain.gitBranch ?? null,
    // Strict: only the literal boolean true counts as verified — a non-boolean
    // (e.g. the string "false" or "true") fails closed.
    verified: domain.verified === true,
  };
}

async function probeSingleHop(ctx) {
  let response;
  try {
    response = await timedFetch(ctx.fetch, PROBE_URL, {
      timeoutMs: ctx.timeoutMs,
      init: { method: "GET", redirect: "manual" },
    });
  } catch (err) {
    return {
      ok: false,
      status: 0,
      location: null,
      resolved: null,
      reason: `probe request failed: ${errMsg(err)}`,
    };
  }
  const status = response?.status;
  const location =
    typeof response?.headers?.get === "function" ? response.headers.get("location") : null;
  if (!PERMANENT_REDIRECT_STATUSES.has(status)) {
    return {
      ok: false,
      status,
      location,
      resolved: null,
      reason: `probe status ${status} is not a 301/308 permanent redirect`,
    };
  }
  if (!location) {
    return {
      ok: false,
      status,
      location,
      resolved: null,
      reason: "probe response has no Location header",
    };
  }
  let resolved = null;
  try {
    resolved = new URL(location, PROBE_URL).href;
  } catch {
    resolved = null;
  }
  if (resolved !== EXPECTED_LOCATION) {
    return {
      ok: false,
      status,
      location,
      resolved,
      reason: `probe resolved to ${resolved}, expected ${EXPECTED_LOCATION}`,
    };
  }
  return { ok: true, status, location, resolved, reason: null };
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

async function writeReport(ctx, report) {
  if (!ctx.flags.report) return;
  await writeJson(ctx, ctx.flags.report, { timestamp: new Date().toISOString(), ...report });
}

async function writeRollbackState(ctx, state) {
  if (!ctx.flags.rollbackState) return;
  await writeJson(ctx, ctx.flags.rollbackState, state);
}

async function writeJson(ctx, path, obj) {
  const dir = dirname(path);
  if (dir && dir !== "." && dir !== "/") {
    try {
      await ctx.mkdir(dir, { recursive: true });
    } catch {
      // Best-effort: the directory may already exist or be provided by CI.
    }
  }
  await ctx.writeFile(path, ctx.redact(`${JSON.stringify(obj, null, 2)}\n`));
}

function errMsg(err) {
  return err?.message ? err.message : String(err);
}

function isDirectRun() {
  return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isDirectRun()) {
  const redact = makeRedactor(process.env.VERCEL_TOKEN);
  main({ argv: process.argv.slice(2), env: process.env })
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      process.exitCode = 1;
      process.stderr.write(`${redact(`Unexpected error: ${errMsg(err)}`)}\n`);
    });
}
