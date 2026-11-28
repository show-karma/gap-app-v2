/**
 * @vitest-environment node
 */
import {
  CF_GEO_CITY_HEADER,
  CF_GEO_COUNTRY_HEADER,
  CF_GEO_REGION_HEADER,
  type CfGeoProperties,
  withCfGeoHeaders,
} from "../../../cloudflare/cf-geo-headers";

function makeIncoming(
  cf?: CfGeoProperties,
  headers?: Record<string, string>
): Request & { cf?: CfGeoProperties } {
  const req = new Request("https://www.karmahq.org/api/geo", { headers }) as Request & {
    cf?: CfGeoProperties;
  };
  if (cf !== undefined) {
    req.cf = cf;
  }
  return req;
}

describe("withCfGeoHeaders", () => {
  it("copies cf.country, prefers cf.regionCode over cf.region, and percent-encodes Unicode city names", () => {
    const incoming = makeIncoming({
      country: "BR",
      region: "São Paulo",
      regionCode: "SP",
      city: "São Paulo",
    });
    const forwarded = new Request("https://www.karmahq.org/api/geo", {
      method: "GET",
      headers: { "x-existing": "keep" },
    });

    const result = withCfGeoHeaders(incoming, forwarded);

    expect(result.method).toBe("GET");
    expect(result.url).toBe("https://www.karmahq.org/api/geo");
    expect(result.headers.get("x-existing")).toBe("keep");
    expect(result.headers.get(CF_GEO_COUNTRY_HEADER)).toBe("BR");
    expect(result.headers.get(CF_GEO_REGION_HEADER)).toBe("SP");
    expect(result.headers.get(CF_GEO_CITY_HEADER)).toBe("S%C3%A3o%20Paulo");
    expect(decodeURIComponent(result.headers.get(CF_GEO_CITY_HEADER) ?? "")).toBe("São Paulo");
  });

  it("percent-encodes Unicode region names when falling back to cf.region", () => {
    const incoming = makeIncoming({
      country: "PL",
      region: "Łódzkie",
      city: "Łódź",
    });
    const forwarded = new Request("https://www.karmahq.org/api/geo");

    const result = withCfGeoHeaders(incoming, forwarded);

    expect(result.headers.get(CF_GEO_COUNTRY_HEADER)).toBe("PL");
    expect(decodeURIComponent(result.headers.get(CF_GEO_REGION_HEADER) ?? "")).toBe("Łódzkie");
    expect(decodeURIComponent(result.headers.get(CF_GEO_CITY_HEADER) ?? "")).toBe("Łódź");
  });

  it("strips client-spoofed x-karma-cf-* headers even when incoming.cf is absent or partial", () => {
    const incoming = makeIncoming(undefined);
    const forwarded = new Request("https://www.karmahq.org/api/geo", {
      headers: {
        [CF_GEO_COUNTRY_HEADER]: "DE",
        [CF_GEO_REGION_HEADER]: "BE",
        [CF_GEO_CITY_HEADER]: "Berlin",
        "x-other": "ok",
      },
    });

    const result = withCfGeoHeaders(incoming, forwarded);

    expect(result.headers.get(CF_GEO_COUNTRY_HEADER)).toBeNull();
    expect(result.headers.get(CF_GEO_REGION_HEADER)).toBeNull();
    expect(result.headers.get(CF_GEO_CITY_HEADER)).toBeNull();
    expect(result.headers.get("x-other")).toBe("ok");

    const partialIncoming = makeIncoming({ country: "CA" });
    const partialResult = withCfGeoHeaders(partialIncoming, forwarded);
    expect(partialResult.headers.get(CF_GEO_COUNTRY_HEADER)).toBe("CA");
    expect(partialResult.headers.get(CF_GEO_REGION_HEADER)).toBeNull();
    expect(partialResult.headers.get(CF_GEO_CITY_HEADER)).toBeNull();
  });

  it("returns the forwarded request unchanged when neither cf geo nor spoofed headers exist", () => {
    const incoming = makeIncoming();
    const forwarded = new Request("https://www.karmahq.org/api/geo");

    expect(withCfGeoHeaders(incoming, forwarded)).toBe(forwarded);
  });
});
