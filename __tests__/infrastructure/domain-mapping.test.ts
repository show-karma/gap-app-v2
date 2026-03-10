import { getDefaultSharedDomain } from "@/src/infrastructure/config/domain-constants";
import {
  getCommunityDomain,
  getDomainMappingByCommunity,
  getDomainMappingBySlug,
  isSharedSubdomain,
} from "@/src/infrastructure/config/domain-mapping";

describe("getDefaultSharedDomain", () => {
  it("returns karmahq.xyz as the shared domain", () => {
    expect(getDefaultSharedDomain()).toBe("karmahq.xyz");
  });
});

describe("getCommunityDomain", () => {
  it("returns whitelabel domain for a community with exclusive domain (optimism)", () => {
    const domain = getCommunityDomain("optimism");
    // optimism has whitelabelDomain = "app.opgrants.io" (first exclusive domain)
    expect(domain).toBe("app.opgrants.io");
  });

  it("returns shared domain path for a community without custom domain (arbitrum)", () => {
    const domain = getCommunityDomain("arbitrum");
    expect(domain).toBe("karmahq.xyz/arbitrum");
  });

  it("returns shared domain path for karma community", () => {
    const domain = getCommunityDomain("karma");
    expect(domain).toBe("karmahq.xyz/karma");
  });

  it("returns base domain when communityId has no mapping", () => {
    // "default" is a valid TenantId but has no mapping entry
    const domain = getCommunityDomain("default" as never);
    expect(domain).toBe("karmahq.xyz");
  });

  it("forceSharedSubdomain=true returns shared domain path even for communities with exclusive domain", () => {
    const domain = getCommunityDomain("optimism", true);
    expect(domain).toBe("karmahq.xyz/optimism");
  });

  it("path uses slug matching the community id", () => {
    const domain = getCommunityDomain("scroll");
    // scroll has no whitelabelDomain set
    expect(domain).toBe("karmahq.xyz/scroll");
  });
});

describe("getDomainMappingBySlug", () => {
  it("returns mapping for a known slug", () => {
    const mapping = getDomainMappingBySlug("optimism");
    expect(mapping).toBeDefined();
    expect(mapping?.id).toBe("optimism");
    expect(mapping?.slug).toBe("optimism");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getDomainMappingBySlug("community")).toBeUndefined();
    expect(getDomainMappingBySlug("unknown")).toBeUndefined();
  });
});

describe("getDomainMappingByCommunity", () => {
  it("returns mapping for a known tenant id", () => {
    const mapping = getDomainMappingByCommunity("arbitrum");
    expect(mapping).toBeDefined();
    expect(mapping?.id).toBe("arbitrum");
  });

  it("returns undefined for unknown tenant id", () => {
    expect(getDomainMappingByCommunity("default" as never)).toBeUndefined();
  });
});

describe("isSharedSubdomain", () => {
  it("returns true for shared domains", () => {
    expect(isSharedSubdomain("karmahq.xyz")).toBe(true);
    expect(isSharedSubdomain("app.karmahq.xyz")).toBe(true);
    expect(isSharedSubdomain("staging.karmahq.xyz")).toBe(true);
  });

  it("returns false for exclusive tenant domains", () => {
    expect(isSharedSubdomain("app.opgrants.io")).toBe(false);
    expect(isSharedSubdomain("grantsapp.scroll.io")).toBe(false);
  });

  it("returns true for unknown domains (fail-open)", () => {
    // isSharedDomain returns true when domain is not in DOMAIN_CONFIGS
    expect(isSharedSubdomain("localhost")).toBe(true);
    expect(isSharedSubdomain("unknown.example.com")).toBe(true);
  });
});
