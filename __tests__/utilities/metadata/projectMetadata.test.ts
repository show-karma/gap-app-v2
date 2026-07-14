import type { Grant } from "@/types/v2/grant";
import type { Project as ProjectResponse } from "@/types/v2/project";
import {
  generateGrantImpactCriteriaMetadata,
  generateGrantMilestonesMetadata,
  generateGrantOverviewMetadata,
  generateProjectAboutMetadata,
  generateProjectContactMetadata,
  generateProjectFundingMetadata,
  generateProjectImpactMetadata,
  generateProjectOverviewMetadata,
  generateProjectTeamMetadata,
  generateProjectUpdatesMetadata,
} from "@/utilities/metadata/projectMetadata";

const project = {
  uid: "0x1",
  details: { title: "Acme", slug: "acme", description: "A grant project" },
} as unknown as ProjectResponse;

const grant = {
  uid: "0xgrant",
  details: { title: "Seed Grant", description: "A seed grant" },
} as unknown as Grant;

describe("generateProjectContactMetadata", () => {
  it("marks the auth-gated contact-info page as noindex but followable", () => {
    const meta = generateProjectContactMetadata(project, "acme");

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("still self-canonicalizes to the contact-info path", () => {
    const meta = generateProjectContactMetadata(project, "acme");

    expect(meta.alternates?.canonical).toBe("/project/acme/contact-info");
  });
});

describe("generateProjectAboutMetadata", () => {
  it("does not set noindex on the public about page", () => {
    const meta = generateProjectAboutMetadata(project, "acme");

    expect(meta.robots).toBeUndefined();
  });

  it("canonicalizes the about tab to the project root to consolidate ranking signals", () => {
    const meta = generateProjectAboutMetadata(project, "acme");

    expect(meta.alternates?.canonical).toBe("/project/acme");
  });
});

describe("noindexed thin tab generators", () => {
  it("marks the impact tab as noindex but followable", () => {
    const meta = generateProjectImpactMetadata(project, "acme");

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("marks the grant overview tab as noindex but followable", () => {
    const meta = generateGrantOverviewMetadata(project, grant, "acme", "0xgrant");

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("marks the grant milestones tab as noindex but followable", () => {
    const meta = generateGrantMilestonesMetadata(project, grant, "acme", "0xgrant");

    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it("marks the grant impact-criteria tab as noindex but followable", () => {
    const meta = generateGrantImpactCriteriaMetadata(project, grant, "acme", "0xgrant");

    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("indexable project tab generators", () => {
  it("keeps the overview, team, updates, and funding tabs indexable", () => {
    expect(generateProjectOverviewMetadata(project, "acme").robots).toBeUndefined();
    expect(generateProjectTeamMetadata(project, "acme").robots).toBeUndefined();
    expect(generateProjectUpdatesMetadata(project, "acme").robots).toBeUndefined();
    expect(generateProjectFundingMetadata(project, "acme").robots).toBeUndefined();
  });
});
