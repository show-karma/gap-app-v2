import { sentryIgnoreErrors } from "../../../../utilities/sentry/ignoreErrors";

const matches = (value: string) =>
  sentryIgnoreErrors.some((rule) =>
    typeof rule === "string" ? value.includes(rule) : rule.test(value)
  );

describe("sentryIgnoreErrors", () => {
  it("suppresses MetaMask connection failures from the injected provider", () => {
    expect(sentryIgnoreErrors).toContain("Failed to connect to MetaMask");
  });

  it("suppresses Next.js streaming aborts surfaced as 'Connection closed.' (DEV-257)", () => {
    expect(matches("Error: Connection closed.")).toBe(true);
    expect(matches("Connection closed.")).toBe(true);
  });

  it("does not over-match unrelated 'connection' errors", () => {
    expect(matches("WebSocket connection failed")).toBe(false);
    expect(matches("Database connection refused")).toBe(false);
  });
});
