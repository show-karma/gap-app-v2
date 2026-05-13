import { describe, expect, it } from "vitest";
import { sentryIgnoreErrors } from "@/utilities/sentry/ignoreErrors";

describe("sentryIgnoreErrors", () => {
  it("filters Sentry's lazy-loaded Replay integration load failures", () => {
    expect(sentryIgnoreErrors).toContain("Error when loading integration: replayIntegration");
  });
});
