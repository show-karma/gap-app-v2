import { sentryIgnoreErrors } from "../../../../utilities/sentry/ignoreErrors";

describe("sentryIgnoreErrors", () => {
  it("suppresses MetaMask connection failures from the injected provider", () => {
    expect(sentryIgnoreErrors).toContain("Failed to connect to MetaMask");
  });
});
