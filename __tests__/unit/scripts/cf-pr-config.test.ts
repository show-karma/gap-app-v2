/**
 * @vitest-environment node
 */
import { resolve } from "node:path";
import {
  buildPrConfigs,
  PREVIEW_DOMAIN,
  PREVIEW_ZONE,
  previewHostname,
} from "../../../scripts/cf-pr-config.mjs";

const routingConfigPath = resolve(process.cwd(), "wrangler.jsonc");
const appConfigPath = resolve(process.cwd(), "wrangler.app.jsonc");

describe("cf-pr-config", () => {
  it("builds the preview hostname under preview.karmahq.org", () => {
    expect(PREVIEW_ZONE).toBe("karmahq.org");
    expect(PREVIEW_DOMAIN).toBe("preview.karmahq.org");
    expect(previewHostname("2261")).toBe("pr-2261.preview.karmahq.org");
  });

  it("builds routing and app configs with the PR custom domain and shared preview bucket", () => {
    const { routing, routingConfig, appConfig } = buildPrConfigs("2261", {
      routingConfigPath,
      appConfigPath,
    });

    expect(routing).toBe("gap-app-v2-pr-2261");
    expect(routingConfig.name).toBe("gap-app-v2-pr-2261");
    expect(appConfig.name).toBe("gap-app-v2-pr-2261-app");
    expect(routingConfig.routes).toEqual([
      { pattern: "pr-2261.preview.karmahq.org", zone_name: "karmahq.org", custom_domain: true },
    ]);
    expect(routingConfig.workers_dev).toBe(true);
    expect(routingConfig.preview_urls).toBe(false);
    expect(routingConfig.triggers).toEqual({ crons: [] });
    expect(routingConfig.vars.APP_ENV).toBe("preview");
    expect(routingConfig.services).toEqual(
      expect.arrayContaining([
        { binding: "WORKER_SELF_REFERENCE", service: "gap-app-v2-pr-2261" },
        { binding: "NEXT_SERVER", service: "gap-app-v2-pr-2261-app" },
      ])
    );
    expect(routingConfig.r2_buckets[0].bucket_name).toBe("gap-app-v2-pr-opennext-cache");
    expect(JSON.stringify(routingConfig)).not.toContain("gap-app-v2-staging");
    expect(JSON.stringify(appConfig)).not.toContain("gap-app-v2-staging");
  });

  it("omits NEXT_SERVER and routes when --without-next-server is requested", () => {
    const { routingConfig } = buildPrConfigs("2261", {
      withoutNextServer: true,
      routingConfigPath,
      appConfigPath,
    });

    expect(
      routingConfig.services.some(
        (service: { binding: string }) => service.binding === "NEXT_SERVER"
      )
    ).toBe(false);
    expect(routingConfig.routes).toBeUndefined();
  });

  it("rejects invalid pull request numbers", () => {
    expect(() => buildPrConfigs("0", { routingConfigPath, appConfigPath })).toThrow(
      /Invalid PR number/
    );
    expect(() => buildPrConfigs("abc", { routingConfigPath, appConfigPath })).toThrow(
      /Invalid PR number/
    );
  });
});
