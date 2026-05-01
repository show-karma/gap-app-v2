import { findProjectTitleInData, getProjectTitle } from "../getProjectTitle";

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

  it("prefers server-resolved project name over form-data and referenceNumber", () => {
    const app = {
      ...makeApplication({ "Some Field": "value" }),
      resolvedProjectName: "Titan Network",
    };
    expect(getProjectTitle(app)).toBe("Titan Network");
  });

  it("falls back to form-data when resolvedProjectName is whitespace-only", () => {
    const app = {
      ...makeApplication({ "Project Title": "Form Title" }),
      resolvedProjectName: "   ",
    };
    expect(getProjectTitle(app)).toBe("Form Title");
  });
});

describe("findProjectTitleInData", () => {
  it("returns undefined (not the reference number) when no title-like field is present", () => {
    expect(findProjectTitleInData({ "Some Field": "value" })).toBeUndefined();
  });

  it("returns undefined for empty or null applicationData", () => {
    expect(findProjectTitleInData({})).toBeUndefined();
    expect(findProjectTitleInData(null)).toBeUndefined();
    expect(findProjectTitleInData(undefined)).toBeUndefined();
  });

  it("returns the schema title when one exists", () => {
    expect(findProjectTitleInData({ "Project Title": "Alpha" })).toBe("Alpha");
  });

  it("prefers keys with both project + title/name keywords over name-only keys", () => {
    const data = {
      "Team Name": "Internal Name",
      "Project Name": "Actual Project",
    };
    expect(findProjectTitleInData(data)).toBe("Actual Project");
  });

  it("ignores non-string values even when the key matches the pattern", () => {
    const data: Record<string, unknown> = {
      "Project Title": { en: "Nested" },
      "Project Name": "Flat Name",
    };
    // Must not stringify an object into '[object Object]' — fall through to
    // the next candidate instead.
    expect(findProjectTitleInData(data)).toBe("Flat Name");
  });

  it("ignores non-string values and returns undefined when no string candidate exists", () => {
    const data: Record<string, unknown> = {
      "Project Title": { en: "Nested" },
      "Project Count": 7,
      "Project Active": true,
    };
    expect(findProjectTitleInData(data)).toBeUndefined();
  });

  it("ignores whitespace-only strings", () => {
    expect(findProjectTitleInData({ "Project Title": "   ", "Pod Name": "Real Name" })).toBe(
      "Real Name"
    );
  });
});
