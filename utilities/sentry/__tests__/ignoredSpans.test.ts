import { describe, expect, it } from "vitest";
import { sentryIgnoredSpans } from "../ignoredSpans";

function isIgnored(name: string): boolean {
  return sentryIgnoredSpans.some((pattern) => pattern.test(name));
}

describe("sentryIgnoredSpans", () => {
  it.each([
    "resolve page components",
    "start response",
    "prepare route module",
    "load route module",
    "build component tree",
    "NextNodeServer.clientComponentLoading",
  ])("drops the Next.js internal phase %s", (name) => {
    expect(isIgnored(name)).toBe(true);
  });

  it.each([
    'resolve page server component "/t/[tenant]/project/[projectId]"',
    'resolve layout server component "[tenant]"',
    "generateMetadata /t/[tenant]/layout",
    "GET /t/[tenant]/project/[projectId]",
    "GET https://indexer.example.com/v2/projects/x",
  ])("keeps %s", (name) => {
    expect(isIgnored(name)).toBe(false);
  });
});
