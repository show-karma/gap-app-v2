import { getProjectTitle } from "../getProjectTitle";

const makeApplication = (
  applicationData: Record<string, unknown>,
  referenceNumber = "APP-12345-67890"
) => ({
  applicationData,
  referenceNumber,
});

describe("getProjectTitle", () => {
  it("returns field matching both project keyword and title/name keyword", () => {
    const app = makeApplication({
      "Project Title": "My Project",
      "Other Field": "other",
    });
    expect(getProjectTitle(app)).toBe("My Project");
  });

  it("returns field matching title/name when no project keyword match", () => {
    const app = makeApplication({
      "Pod Name": "My Pod",
      "Some other field": "value",
    });
    expect(getProjectTitle(app)).toBe("My Pod");
  });

  it("falls back to referenceNumber when no title/name field exists", () => {
    const app = makeApplication({
      "Some Field": "value",
      "Another Field": "value2",
    });
    expect(getProjectTitle(app)).toBe("APP-12345-67890");
  });

  it("prefers short name-like field over long field that incidentally contains 'name'", () => {
    const app = makeApplication({
      "What support or collaboration do you need from your Pod (e.g. design reviews, infra access, data support)? Please name the teams / projects with brief details on their scope of support / collaboration.":
        "We need design reviews",
      "Pod Name": "Awesome Pod",
    });
    expect(getProjectTitle(app)).toBe("Awesome Pod");
  });

  it("prefers 'Pod Name' over a verbose field containing 'name' regardless of key order", () => {
    const app = makeApplication({
      "Team Lead / Point of Contact": "John",
      "What support or collaboration do you need from your Pod? Please name the teams.":
        "Infra team",
      "Pod Name": "Storage Pod",
    });
    expect(getProjectTitle(app)).toBe("Storage Pod");
  });

  it("handles case insensitivity", () => {
    const app = makeApplication({
      "PROJECT NAME": "Uppercase Project",
    });
    expect(getProjectTitle(app)).toBe("Uppercase Project");
  });

  it("handles empty applicationData", () => {
    const app = makeApplication({});
    expect(getProjectTitle(app)).toBe("APP-12345-67890");
  });

  it("handles null applicationData", () => {
    const app = makeApplication(null as unknown as Record<string, unknown>);
    expect(getProjectTitle(app)).toBe("APP-12345-67890");
  });

  it("skips field if value is empty", () => {
    const app = makeApplication({
      "Project Title": "",
      "Pod Name": "Fallback Pod",
    });
    expect(getProjectTitle(app)).toBe("Fallback Pod");
  });
});
