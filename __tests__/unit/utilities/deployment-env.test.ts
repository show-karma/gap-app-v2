import {
  type DeploymentEnvSources,
  deploymentBuildEnv,
  deploymentEnv,
  isPreviewDeployment,
  isProductionDeployment,
  isVercelPlatform,
  platformDeploymentOrigin,
  resolveDeploymentEnv,
  vercelAnalyticsEnabled,
} from "@/utilities/deployment-env";

const VARS = [
  "APP_ENV",
  "NEXT_PUBLIC_APP_ENV",
  "VERCEL_ENV",
  "NEXT_PUBLIC_VERCEL_ENV",
  "VERCEL",
  "VERCEL_URL",
  "NEXT_PUBLIC_VERCEL_ANALYTICS",
] as const;

/** Start every test from an environment with none of the variables set. */
beforeEach(() => {
  for (const key of VARS) vi.stubEnv(key, undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveDeploymentEnv", () => {
  it("is undefined when nothing is set", () => {
    expect(resolveDeploymentEnv({})).toBeUndefined();
  });

  it.each(["production", "preview", "development"] as const)(
    "reads %s from any single variable",
    (value) => {
      for (const key of [
        "APP_ENV",
        "NEXT_PUBLIC_APP_ENV",
        "VERCEL_ENV",
        "NEXT_PUBLIC_VERCEL_ENV",
      ] as const) {
        expect(resolveDeploymentEnv({ [key]: value })).toBe(value);
      }
    }
  );

  it("prefers the neutral variables over Vercel's", () => {
    expect(resolveDeploymentEnv({ APP_ENV: "production", VERCEL_ENV: "preview" })).toBe(
      "production"
    );
    expect(
      resolveDeploymentEnv({ NEXT_PUBLIC_APP_ENV: "production", NEXT_PUBLIC_VERCEL_ENV: "preview" })
    ).toBe("production");
    expect(resolveDeploymentEnv({ APP_ENV: "preview", NEXT_PUBLIC_VERCEL_ENV: "production" })).toBe(
      "preview"
    );
  });

  it("prefers the public variable within a pair, so server and browser agree", () => {
    const sources: DeploymentEnvSources = {
      NEXT_PUBLIC_APP_ENV: "production",
      APP_ENV: "preview",
    };
    expect(resolveDeploymentEnv(sources)).toBe("production");
    expect(
      resolveDeploymentEnv({ NEXT_PUBLIC_VERCEL_ENV: "production", VERCEL_ENV: "preview" })
    ).toBe("production");
  });

  it("falls back to Vercel's variables when the neutral ones are absent or empty", () => {
    expect(resolveDeploymentEnv({ VERCEL_ENV: "preview" })).toBe("preview");
    expect(
      resolveDeploymentEnv({ APP_ENV: "", NEXT_PUBLIC_APP_ENV: "", VERCEL_ENV: "preview" })
    ).toBe("preview");
  });

  it.each(["staging", "Production", "PREVIEW", " preview", "prod", "undefined", "true"])(
    "treats an unknown value (%j) as unknown — and does not fall through to Vercel's",
    (value) => {
      expect(resolveDeploymentEnv({ APP_ENV: value, VERCEL_ENV: "preview" })).toBeUndefined();
      expect(
        resolveDeploymentEnv({ NEXT_PUBLIC_APP_ENV: value, VERCEL_ENV: "production" })
      ).toBeUndefined();
      expect(resolveDeploymentEnv({ VERCEL_ENV: value })).toBeUndefined();
    }
  );
});

describe("deploymentEnv and its predicates", () => {
  it("reads process.env at call time", () => {
    expect(deploymentEnv()).toBeUndefined();
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    expect(deploymentEnv()).toBe("production");
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "preview");
    expect(deploymentEnv()).toBe("preview");
  });

  it("matches main on a Vercel deployment (only Vercel's variables set)", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    expect(isProductionDeployment()).toBe(true);
    expect(isPreviewDeployment()).toBe(false);

    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    expect(isProductionDeployment()).toBe(false);
    expect(isPreviewDeployment()).toBe(true);
  });

  it("works with only the neutral variables set", () => {
    vi.stubEnv("APP_ENV", "production");
    expect(isProductionDeployment()).toBe(true);
    vi.stubEnv("APP_ENV", "preview");
    expect(isPreviewDeployment()).toBe(true);
  });

  it("is neither production nor preview when nothing is set", () => {
    expect(isProductionDeployment()).toBe(false);
    expect(isPreviewDeployment()).toBe(false);
  });
});

describe("isVercelPlatform", () => {
  it("follows the VERCEL variable Vercel sets in builds and functions", () => {
    expect(isVercelPlatform()).toBe(false);
    vi.stubEnv("VERCEL", "1");
    expect(isVercelPlatform()).toBe(true);
    vi.stubEnv("VERCEL", "");
    expect(isVercelPlatform()).toBe(false);
  });
});

describe("vercelAnalyticsEnabled", () => {
  it("is on only for the exact string 'true'", () => {
    expect(vercelAnalyticsEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ANALYTICS", "false");
    expect(vercelAnalyticsEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ANALYTICS", "1");
    expect(vercelAnalyticsEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ANALYTICS", "true");
    expect(vercelAnalyticsEnabled()).toBe(true);
  });
});

describe("platformDeploymentOrigin", () => {
  it("is undefined off Vercel", () => {
    expect(platformDeploymentOrigin()).toBeUndefined();
    vi.stubEnv("VERCEL_URL", "  ");
    expect(platformDeploymentOrigin()).toBeUndefined();
  });

  it("turns Vercel's bare hostname into an https origin", () => {
    vi.stubEnv("VERCEL_URL", "gap-app-v2-abc123-karma-devs.vercel.app");
    expect(platformDeploymentOrigin()).toBe("https://gap-app-v2-abc123-karma-devs.vercel.app");
  });

  it("keeps a value that already carries a scheme, minus a trailing slash", () => {
    vi.stubEnv("VERCEL_URL", "http://localhost:3000/");
    expect(platformDeploymentOrigin()).toBe("http://localhost:3000");
  });
});

describe("deploymentBuildEnv", () => {
  it("adds nothing but the analytics flag on Vercel, where no neutral variable is set", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    expect(deploymentBuildEnv()).toEqual({ NEXT_PUBLIC_VERCEL_ANALYTICS: "true" });
  });

  it("turns analytics off off Vercel", () => {
    expect(deploymentBuildEnv()).toEqual({ NEXT_PUBLIC_VERCEL_ANALYTICS: "false" });
  });

  it("keeps an explicit analytics flag either way", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ANALYTICS", "true");
    expect(deploymentBuildEnv().NEXT_PUBLIC_VERCEL_ANALYTICS).toBe("true");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ANALYTICS", "false");
    expect(deploymentBuildEnv().NEXT_PUBLIC_VERCEL_ANALYTICS).toBe("false");
  });

  it("ignores a malformed analytics flag and follows the platform", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ANALYTICS", "yes");
    expect(deploymentBuildEnv().NEXT_PUBLIC_VERCEL_ANALYTICS).toBe("false");
  });

  it("copies APP_ENV into the bundle when only the server variable is set", () => {
    vi.stubEnv("APP_ENV", "preview");
    expect(deploymentBuildEnv().NEXT_PUBLIC_APP_ENV).toBe("preview");
  });

  it("never overrides an explicit NEXT_PUBLIC_APP_ENV", () => {
    vi.stubEnv("APP_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "production");
    expect(deploymentBuildEnv()).not.toHaveProperty("NEXT_PUBLIC_APP_ENV");
  });
});
