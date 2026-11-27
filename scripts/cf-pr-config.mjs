#!/usr/bin/env node
// Writes the wrangler configs of one pull request's preview: a pair of Workers
// like the staging one (routing Worker + Next server Worker), with their own
// names, so each PR is served by its own code end to end
// (.github/workflows/cloudflare-pr-preview.yml).
//
// Each PR preview is served at https://pr-<n>.preview.karmahq.org via a Worker
// Custom Domain (custom_domain: true on zone karmahq.org, which provisions DNS
// and a dedicated 2nd-level TLS certificate automatically on the Free plan).
// At production cutover, add an exclusion Workers Route
// (`*.preview.karmahq.org/*` -> None) so `*/*` does not override PR previews.
//
//   node scripts/cf-pr-config.mjs <pr number> [--without-next-server]
//
// Writes wrangler.pr.jsonc (routing) and wrangler.app.pr.jsonc (Next server) at
// the app root, next to the files they are made from, so relative paths keep
// working. Each is the `env.staging` section of wrangler.jsonc /
// wrangler.app.jsonc over its top level, with every staging Worker and bucket
// name replaced:
//   gap-app-v2-staging                 → gap-app-v2-pr-<n>
//   gap-app-v2-staging-app             → gap-app-v2-pr-<n>-app
//   gap-app-v2-staging-opennext-cache  → gap-app-v2-pr-opennext-cache (shared:
//                                        every build writes under its own build id)
//
// --without-next-server leaves the routing Worker's NEXT_SERVER binding and
// Custom Domain out. The first deploy of a PR needs it: the Next server Worker
// binds the Durable Objects of the routing Worker by script name, so the
// routing Worker must exist first, before the Worker its own binding points at.
import { realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_readRawConfig } from "wrangler";

const STAGING = "gap-app-v2-staging";
const SHARED_BUCKET = "gap-app-v2-pr-opennext-cache";
export const PREVIEW_ZONE = "karmahq.org";
export const PREVIEW_DOMAIN = `preview.${PREVIEW_ZONE}`;

/**
 * Returns the preview hostname for a pull request number.
 * @param {string | number} pr
 */
export function previewHostname(pr) {
  return `pr-${pr}.${PREVIEW_DOMAIN}`;
}

/** Replaces every string that is exactly a staging name; leaves the rest. */
function rename(value, names) {
  if (typeof value === "string") return names.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => rename(item, names));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, rename(v, names)]));
  }
  return value;
}

/** The staging environment of a config, flattened, with the PR's names. */
function prConfig(file, names) {
  const { rawConfig } = experimental_readRawConfig({ config: file });
  const { env, ...topLevel } = rawConfig;
  if (!env?.staging) throw new Error(`${file} has no env.staging`);
  const config = rename({ ...topLevel, ...env.staging }, names);
  const leftover = JSON.stringify(config).match(/gap-app-v2-staging[\w-]*/);
  if (leftover) throw new Error(`${file}: ${leftover[0]} has no PR name`);
  return config;
}

/**
 * Builds flattened Wrangler configs for a pull request preview.
 * @param {string | number} pr
 * @param {{ withoutNextServer?: boolean; routingConfigPath?: string; appConfigPath?: string }} [options]
 */
export function buildPrConfigs(pr, options = {}) {
  const prNumber = String(pr ?? "");
  if (!/^[1-9]\d*$/.test(prNumber)) {
    throw new Error(`Invalid PR number: ${pr}`);
  }
  const {
    withoutNextServer = false,
    routingConfigPath = "wrangler.jsonc",
    appConfigPath = "wrangler.app.jsonc",
  } = options;

  const routing = `gap-app-v2-pr-${prNumber}`;
  const names = new Map([
    [STAGING, routing],
    [`${STAGING}-app`, `${routing}-app`],
    [`${STAGING}-opennext-cache`, SHARED_BUCKET],
  ]);

  const routingConfig = prConfig(routingConfigPath, names);
  routingConfig.workers_dev = true;
  routingConfig.preview_urls = false;
  routingConfig.triggers = { crons: [] };

  if (withoutNextServer) {
    routingConfig.services = routingConfig.services.filter((s) => s.binding !== "NEXT_SERVER");
    // Never attach pr-<n>.preview.karmahq.org to the bootstrap stub Worker before NEXT_SERVER exists.
    delete routingConfig.routes;
  } else {
    routingConfig.routes = [
      {
        pattern: previewHostname(prNumber),
        zone_name: PREVIEW_ZONE,
        custom_domain: true,
      },
    ];
  }

  const appConfig = prConfig(appConfigPath, names);
  return { routing, routingConfig, appConfig };
}

const isMain =
  Boolean(process.argv[1]) &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);

if (isMain) {
  const [pr, flag] = process.argv.slice(2);
  if (!/^[1-9]\d*$/.test(pr ?? "") || (flag && flag !== "--without-next-server")) {
    process.stderr.write("Usage: cf-pr-config.mjs <pr number> [--without-next-server]\n");
    process.exit(2);
  }
  const { routing, routingConfig, appConfig } = buildPrConfigs(pr, {
    withoutNextServer: flag === "--without-next-server",
  });
  const header = "// Generated by scripts/cf-pr-config.mjs; do not edit or commit.\n";
  writeFileSync("wrangler.pr.jsonc", `${header}${JSON.stringify(routingConfig, null, 2)}\n`);
  writeFileSync("wrangler.app.pr.jsonc", `${header}${JSON.stringify(appConfig, null, 2)}\n`);
  process.stdout.write(`Configs for ${routing} and ${routing}-app\n`);
}
