import { describe, expect, it } from "vitest";
import {
  domainToScanUrl,
  hostnameOf,
  isDomainParam,
  isScanIdParam,
} from "@/src/features/scanner/utils/site";

// The `scans/[id]` route param is overloaded: a UUID is a permalink, a domain
// is the constructible website URL. These helpers are the seam that tells them
// apart and normalizes a domain into the stable by-url lookup key.
const UUID = "0b1c2d3e-4f56-4789-abcd-0123456789ef";

describe("isScanIdParam", () => {
  it("accepts a v4-shaped UUID", () => {
    expect(isScanIdParam(UUID)).toBe(true);
  });

  it("accepts an uppercase UUID", () => {
    expect(isScanIdParam(UUID.toUpperCase())).toBe(true);
  });

  it("rejects a bare domain", () => {
    expect(isScanIdParam("karmahq.xyz")).toBe(false);
  });

  it("rejects a domain that merely contains hex groups", () => {
    expect(isScanIdParam("abcdef12-3456.org")).toBe(false);
  });
});

describe("isDomainParam", () => {
  it("treats a dotted non-UUID value as a domain", () => {
    expect(isDomainParam("karmahq.xyz")).toBe(true);
  });

  it("does not treat a UUID as a domain", () => {
    expect(isDomainParam(UUID)).toBe(false);
  });

  it("does not treat a dotless token as a domain", () => {
    expect(isDomainParam("localhost")).toBe(false);
  });
});

describe("domainToScanUrl", () => {
  it("builds an https URL from a bare domain", () => {
    expect(domainToScanUrl("karmahq.xyz")).toBe("https://karmahq.xyz");
  });

  it("strips a www. prefix so the lookup key is canonical", () => {
    expect(domainToScanUrl("www.karmahq.xyz")).toBe("https://karmahq.xyz");
  });

  it("normalizes an already-qualified URL down to its host", () => {
    expect(domainToScanUrl("http://karmahq.xyz/path?q=1")).toBe("https://karmahq.xyz");
  });

  it("returns null for an unparseable value", () => {
    expect(domainToScanUrl("not a domain")).toBeNull();
  });
});

describe("hostnameOf", () => {
  it("round-trips a domainToScanUrl result back to the bare host", () => {
    const url = domainToScanUrl("www.karmahq.xyz");
    expect(hostnameOf(url)).toBe("karmahq.xyz");
  });
});
