/**
 * V2 Migration Validation Tests
 *
 * These tests verify that the V2 migration is working correctly:
 * - V2 mock utilities work as expected
 * - Normalization helpers function correctly
 * - Optional chaining prevents crashes
 * - Type safety is maintained
 */

import {
  createMinimalMockProjectV2,
  createMockProjectV2,
  createMockProjectV2List,
  createMockProjectV2WithGrants,
} from "@/__tests__/utils/mockProjectV2";
import type { ProjectV2Response } from "@/types/project";
import {
  getCustomLinks,
  getLinkByType,
  getProjectIdentifier,
  isV1Project,
  normalizeProjectData,
} from "@/utilities/normalizeProjectData";

describe("V2 Migration - Validation Tests", () => {
  describe("Mock Utilities", () => {
    it("should create a complete V2 project mock", () => {
      const project = createMockProjectV2();

      // Verify V2 structure
      expect(project.uid).toBeDefined();
      expect(project.owner).toBeDefined();
      expect(project.details).toBeDefined();
      expect(project.details.title).toBe("Test Project");
      expect(project.details.slug).toBe("test-project");

      // Verify V1 structure doesn't exist
      expect((project.details as any).data).toBeUndefined();
      expect((project as any).recipient).toBeUndefined();

      // Verify arrays are initialized
      expect(Array.isArray(project.members)).toBe(true);
      expect(Array.isArray(project.grants)).toBe(true);
    });

    it("should create a project with grants", () => {
      const project = createMockProjectV2WithGrants(3);

      expect(project.grants).toBeDefined();
      expect(project.grants?.length).toBe(3);
      expect(project.grants?.[0].details.data.title).toBe("Grant 1");
      expect(project.grants?.[1].details.data.title).toBe("Grant 2");
      expect(project.grants?.[2].details.data.title).toBe("Grant 3");
    });

    it("should create a minimal mock", () => {
      const project = createMinimalMockProjectV2();

      expect(project.uid).toBe("0x123");
      expect(project.owner).toBe("0xabc");
      expect(project.details.title).toBe("Minimal Project");
    });

    it("should create a list of projects", () => {
      const projects = createMockProjectV2List(5);

      expect(projects).toHaveLength(5);
      expect(projects[0].details.title).toBe("Project 1");
      expect(projects[4].details.title).toBe("Project 5");
    });

    it("should allow custom overrides", () => {
      const project = createMockProjectV2({
        details: {
          title: "Custom Title",
          slug: "custom-slug",
        },
        owner: "0xcustom" as `0x${string}`,
      });

      expect(project.details.title).toBe("Custom Title");
      expect(project.details.slug).toBe("custom-slug");
      expect(project.owner).toBe("0xcustom");
    });
  });

  describe("Normalization Helper", () => {
    it("should normalize V2 project correctly", () => {
      const v2Project = createMockProjectV2();
      const normalized = normalizeProjectData(v2Project);

      expect(normalized).toBeDefined();
      expect(normalized?.title).toBe("Test Project");
      expect(normalized?.description).toBe("A test project for unit testing");
      expect(normalized?.owner).toBe("0xabcdef1234567890");
      expect(normalized?.slug).toBe("test-project");
    });

    it("should detect V2 project correctly", () => {
      const v2Project = createMockProjectV2();
      expect(isV1Project(v2Project)).toBe(false);
    });

    it("should handle undefined project gracefully", () => {
      const normalized = normalizeProjectData(undefined);
      expect(normalized).toBeNull();
    });

    it("should extract links correctly", () => {
      const project = createMockProjectV2();
      const normalized = normalizeProjectData(project);

      expect(normalized).toBeDefined();
      const twitter = getLinkByType(normalized!.links, "twitter");
      const github = getLinkByType(normalized!.links, "github");
      const discord = getLinkByType(normalized!.links, "discord");

      expect(twitter).toBe("https://twitter.com/testproject");
      expect(github).toBe("https://github.com/testproject");
      expect(discord).toBe("https://discord.gg/testproject");
    });

    it("should extract custom links", () => {
      const project = createMockProjectV2({
        details: {
          links: [
            { type: "custom", url: "https://custom1.com", name: "Custom 1" },
            { type: "custom", url: "https://custom2.com", name: "Custom 2" },
            { type: "twitter", url: "https://twitter.com/test" },
          ],
        },
      });

      const normalized = normalizeProjectData(project);
      const customLinks = getCustomLinks(normalized!.links);

      expect(customLinks).toHaveLength(2);
      expect(customLinks[0]).toEqual({ name: "Custom 1", url: "https://custom1.com" });
      expect(customLinks[1]).toEqual({ name: "Custom 2", url: "https://custom2.com" });
    });

    it("should get project identifier (slug or uid)", () => {
      const projectWithSlug = createMockProjectV2({
        details: { slug: "my-project" },
      });
      const projectWithoutSlug = createMockProjectV2({
        uid: "0xabc123" as `0x${string}`,
        details: { slug: undefined } as any,
      });

      expect(getProjectIdentifier(projectWithSlug)).toBe("my-project");
      expect(getProjectIdentifier(projectWithoutSlug)).toBe("0xabc123");
      expect(getProjectIdentifier(undefined)).toBe("");
    });
  });

  describe("Optional Chaining Safety", () => {
    it("should safely handle undefined grants", () => {
      const projectWithGrants = createMockProjectV2WithGrants(2);
      const projectWithoutGrants = createMockProjectV2({ grants: undefined });

      let count = 0;

      // Should work with grants
      projectWithGrants.grants?.forEach(() => {
        count++;
      });
      expect(count).toBe(2);

      // Should not crash without grants
      count = 0;
      expect(() => {
        projectWithoutGrants.grants?.forEach(() => {
          count++;
        });
      }).not.toThrow();
      expect(count).toBe(0);
    });

    it("should safely handle undefined updates", () => {
      const project = createMockProjectV2({ updates: undefined });

      expect(() => {
        project.updates?.forEach(() => {});
      }).not.toThrow();
    });

    it("should safely handle undefined members", () => {
      const project = createMockProjectV2({ members: undefined });

      expect(() => {
        project.members?.forEach(() => {});
      }).not.toThrow();
    });
  });

  describe("Type Safety", () => {
    it("should have correct TypeScript types", () => {
      const project: ProjectV2Response = createMockProjectV2();

      // These should compile without errors
      const title: string = project.details.title;
      const owner: `0x${string}` = project.owner;
      const slug: string | undefined = project.details.slug;
      const grants: any[] | undefined = project.grants;

      expect(title).toBeDefined();
      expect(owner).toBeDefined();
      expect(slug).toBeDefined();
      expect(grants).toBeDefined();
    });

    it("should not allow V1 structure access", () => {
      const project = createMockProjectV2();

      // TypeScript should catch these (but we test at runtime)
      expect((project.details as any).data).toBeUndefined();
      expect((project as any).recipient).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty arrays", () => {
      const project = createMockProjectV2({
        grants: [],
        members: [],
        updates: [],
      });

      expect(project.grants).toEqual([]);
      expect(project.members).toEqual([]);
      expect(project.updates).toEqual([]);
    });

    it("should handle missing optional fields", () => {
      const project = createMockProjectV2({
        details: {
          title: "Required Title",
          description: "Required Description",
          slug: "required-slug",
          // All other fields are optional
        },
      });

      expect(project.details.title).toBe("Required Title");
      expect(project.details.problem).toBeUndefined();
      expect(project.details.solution).toBeUndefined();
    });

    it("should preserve custom properties through normalization", () => {
      const project = createMockProjectV2({
        details: {
          businessModel: "Freemium",
          stageIn: "Growth",
          raisedMoney: "$1M",
        },
      });

      const normalized = normalizeProjectData(project);

      expect(normalized?.businessModel).toBe("Freemium");
      expect(normalized?.stageIn).toBe("Growth");
      expect(normalized?.raisedMoney).toBe("$1M");
    });
  });
});
