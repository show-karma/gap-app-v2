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

  it("suppresses anonymous Authorization header errors (DEV-256)", () => {
    expect(matches("Authorization header is required")).toBe(true);
  });

  it("suppresses React 19 streaming reconciliation parentNode/removeChild null crashes (GAP-FRONTEND-212)", () => {
    expect(matches("TypeError: Cannot read properties of null (reading 'parentNode')")).toBe(true);
    expect(matches("Cannot read properties of null (reading 'removeChild')")).toBe(true);
    // Safari/WebKit phrasing of the same fault
    expect(matches("null is not an object (evaluating 'a.parentNode')")).toBe(true);
    expect(matches("null is not an object (evaluating 'node.removeChild')")).toBe(true);
  });

  it("does not over-match unrelated null property reads", () => {
    expect(matches("Cannot read properties of null (reading 'length')")).toBe(false);
    expect(matches("Cannot read properties of null (reading 'address')")).toBe(false);
  });
});
