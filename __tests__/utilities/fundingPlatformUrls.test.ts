import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The funding-platform URL helpers read `envVars` and `window.location` at CALL time, so
 * these tests vary both per case:
 *  - `mockEnv` is a mutable object backing the mocked `@/utilities/enviromentVars` module.
 *  - `window.location.hostname` is stubbed via `vi.stubGlobal`.
 *
 * They assert the exact emitted hrefs for each helper across the three regimes that the fix
 * cares about: deployed (external tenant domains), localhost (same-origin paths matching the
 * real route tree), whitelabel (current-origin precedence), plus the explicit env override in
 * both directions.
 */

const mockEnv: {
  isDev: boolean;
  NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS: string | undefined;
} = {
  isDev: false,
  NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS: undefined,
};

vi.mock("@/utilities/enviromentVars", () => ({
  get envVars() {
    return mockEnv;
  },
}));

function setHostname(hostname: string) {
  vi.stubGlobal("window", {
    location: { hostname, origin: `https://${hostname}` },
  });
}

// Import after the mock is registered.
import {
  getBrowseApplicationsUrl,
  getDomainForCommunity,
  getGatedApplyUrl,
  getProgramApplyUrl,
  getProgramPageUrl,
  shouldUseExternalFundingPlatformLinks,
} from "@/utilities/fundingPlatformUrls";

beforeEach(() => {
  mockEnv.isDev = false;
  mockEnv.NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS = undefined;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shouldUseExternalFundingPlatformLinks", () => {
  it("returns false on localhost by default", () => {
    setHostname("localhost");
    expect(shouldUseExternalFundingPlatformLinks()).toBe(false);
  });

  it("returns false on 127.0.0.1 by default", () => {
    setHostname("127.0.0.1");
    expect(shouldUseExternalFundingPlatformLinks()).toBe(false);
  });

  it("returns true on a deployed host by default", () => {
    setHostname("gap.karmahq.xyz");
    expect(shouldUseExternalFundingPlatformLinks()).toBe(true);
  });

  it("honors the explicit 'true' override even on localhost", () => {
    setHostname("localhost");
    mockEnv.NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS = "true";
    expect(shouldUseExternalFundingPlatformLinks()).toBe(true);
  });

  it("honors the explicit 'false' override even on a deployed host", () => {
    setHostname("gap.karmahq.xyz");
    mockEnv.NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS = "false";
    expect(shouldUseExternalFundingPlatformLinks()).toBe(false);
  });

  it("falls back to external links during SSR (no window)", () => {
    // Simulate a server render where `window` is undefined (jsdom defines it by default).
    vi.stubGlobal("window", undefined);
    expect(shouldUseExternalFundingPlatformLinks()).toBe(true);
  });
});

describe("getProgramApplyUrl", () => {
  it("emits a same-origin path on localhost", () => {
    setHostname("localhost");
    expect(getProgramApplyUrl("optimism", "123")).toBe("/community/optimism/programs/123/apply");
  });

  it("emits the external tenant domain on a deployed host (prod)", () => {
    setHostname("gap.karmahq.xyz");
    expect(getProgramApplyUrl("optimism", "123")).toBe(
      "https://app.opgrants.io/programs/123/apply"
    );
  });

  it("uses the dev tenant domain when isDev is set on a deployed host", () => {
    setHostname("staging.karmahq.xyz");
    mockEnv.isDev = true;
    expect(getProgramApplyUrl("optimism", "123")).toBe(
      "https://testapp.opgrants.io/programs/123/apply"
    );
  });

  it("falls back to the shared domain with a community path for unknown communities", () => {
    setHostname("gap.karmahq.xyz");
    expect(getProgramApplyUrl("unknown-community", "9")).toBe(
      "https://app.karmahq.xyz/unknown-community/programs/9/apply"
    );
  });

  it("prefers the whitelabel origin over everything", () => {
    setHostname("gap.karmahq.xyz");
    expect(getProgramApplyUrl("optimism", "123", "https://grants.optimism.io")).toBe(
      "https://grants.optimism.io/programs/123/apply"
    );
  });
});

describe("getGatedApplyUrl", () => {
  it("appends and encodes the access code on a same-origin path", () => {
    setHostname("localhost");
    expect(getGatedApplyUrl("optimism", "123", "code with spaces & symbols")).toBe(
      "/community/optimism/programs/123/apply?accessCode=code%20with%20spaces%20%26%20symbols"
    );
  });

  it("omits the query string when no access code is provided", () => {
    setHostname("localhost");
    expect(getGatedApplyUrl("optimism", "123")).toBe("/community/optimism/programs/123/apply");
  });
});

describe("getBrowseApplicationsUrl", () => {
  it("emits a same-origin browse path on localhost", () => {
    setHostname("localhost");
    expect(getBrowseApplicationsUrl("optimism", "123")).toBe(
      "/community/optimism/browse-applications?programId=123"
    );
  });

  it("emits the external tenant domain on a deployed host", () => {
    setHostname("gap.karmahq.xyz");
    expect(getBrowseApplicationsUrl("optimism", "123")).toBe(
      "https://app.opgrants.io/browse-applications?programId=123"
    );
  });
});

describe("getProgramPageUrl", () => {
  it("emits a same-origin program path on localhost", () => {
    setHostname("localhost");
    expect(getProgramPageUrl("optimism", "123")).toBe("/community/optimism/programs/123");
  });

  it("emits the external tenant domain on a deployed host", () => {
    setHostname("gap.karmahq.xyz");
    expect(getProgramPageUrl("optimism", "123")).toBe("https://app.opgrants.io/programs/123");
  });
});

describe("getDomainForCommunity", () => {
  it("returns the same-origin base when external links are off", () => {
    setHostname("localhost");
    expect(getDomainForCommunity("optimism")).toBe("/community/optimism");
  });

  it("returns the external tenant domain when external links are on", () => {
    setHostname("gap.karmahq.xyz");
    expect(getDomainForCommunity("optimism")).toBe("https://app.opgrants.io");
  });
});
