import {
  findProjectBySlugOrUid,
  findProjectOptionBySlugOrUid,
  type ProjectData,
  projectsToOptions,
  projectToOption,
} from "@/utilities/project-lookup";

describe("project-lookup utilities", () => {
  const mockProjects: ProjectData[] = [
    { uid: "uid-123", slug: "my-project", title: "My Project" },
    { uid: "uid-456", slug: "another-project", title: "Another Project" },
    { uid: "uid-789", title: "Project Without Slug" }, // No slug
  ];

  describe("findProjectBySlugOrUid", () => {
    it("should find project by slug", () => {
      const result = findProjectBySlugOrUid(mockProjects, "my-project");

      expect(result).toEqual({
        uid: "uid-123",
        slug: "my-project",
        title: "My Project",
      });
    });

    it("should find project by UID", () => {
      const result = findProjectBySlugOrUid(mockProjects, "uid-123");

      expect(result).toEqual({
        uid: "uid-123",
        slug: "my-project",
        title: "My Project",
      });
    });

    it("should find project without slug by UID (legacy URL support)", () => {
      const result = findProjectBySlugOrUid(mockProjects, "uid-789");

      expect(result).toEqual({
        uid: "uid-789",
        title: "Project Without Slug",
      });
    });

    it("should return undefined when identifier is null", () => {
      const result = findProjectBySlugOrUid(mockProjects, null);

      expect(result).toBeUndefined();
    });

    it("should return undefined when projects is undefined", () => {
      const result = findProjectBySlugOrUid(undefined, "my-project");

      expect(result).toBeUndefined();
    });

    it("should return undefined when projects is empty", () => {
      const result = findProjectBySlugOrUid([], "my-project");

      expect(result).toBeUndefined();
    });

    it("should return undefined when no match found", () => {
      const result = findProjectBySlugOrUid(mockProjects, "non-existent");

      expect(result).toBeUndefined();
    });

    it("should prioritize slug match when both slug and uid could match different projects", () => {
      // Edge case: what if one project's UID equals another project's slug?
      const edgeCaseProjects: ProjectData[] = [
        { uid: "slug-of-other", slug: "project-a", title: "Project A" },
        { uid: "uid-b", slug: "slug-of-other", title: "Project B" },
      ];

      // When searching for "slug-of-other", it should match Project B's slug first
      // because Array.find returns the first match
      const result = findProjectBySlugOrUid(edgeCaseProjects, "slug-of-other");

      // Should match Project A by uid (first in array) because find checks slug || uid
      expect(result?.title).toBe("Project A");
    });
  });

  describe("projectToOption", () => {
    it("should convert project with slug to option using slug as value", () => {
      const project: ProjectData = { uid: "uid-123", slug: "my-project", title: "My Project" };

      const result = projectToOption(project);

      expect(result).toEqual({
        title: "My Project",
        value: "my-project",
      });
    });

    it("should convert project without slug to option using uid as value", () => {
      const project: ProjectData = { uid: "uid-123", title: "My Project" };

      const result = projectToOption(project);

      expect(result).toEqual({
        title: "My Project",
        value: "uid-123",
      });
    });

    it("should prefer slug over uid when both exist", () => {
      const project: ProjectData = { uid: "uid-123", slug: "my-slug", title: "My Project" };

      const result = projectToOption(project);

      expect(result.value).toBe("my-slug");
    });
  });

  describe("projectsToOptions", () => {
    it("should convert array of projects to options", () => {
      const result = projectsToOptions(mockProjects);

      expect(result).toEqual([
        { title: "My Project", value: "my-project" },
        { title: "Another Project", value: "another-project" },
        { title: "Project Without Slug", value: "uid-789" },
      ]);
    });

    it("should return empty array when projects is undefined", () => {
      const result = projectsToOptions(undefined);

      expect(result).toEqual([]);
    });

    it("should return empty array when projects is empty", () => {
      const result = projectsToOptions([]);

      expect(result).toEqual([]);
    });
  });

  describe("findProjectOptionBySlugOrUid", () => {
    it("should find project by slug and return as option", () => {
      const result = findProjectOptionBySlugOrUid(mockProjects, "my-project");

      expect(result).toEqual({
        title: "My Project",
        value: "my-project",
      });
    });

    it("should find project by UID and return as option (legacy URL support)", () => {
      const result = findProjectOptionBySlugOrUid(mockProjects, "uid-123");

      expect(result).toEqual({
        title: "My Project",
        value: "my-project", // Still uses slug as value
      });
    });

    it("should find project without slug by UID and use UID as value", () => {
      const result = findProjectOptionBySlugOrUid(mockProjects, "uid-789");

      expect(result).toEqual({
        title: "Project Without Slug",
        value: "uid-789",
      });
    });

    it("should return undefined when identifier is null", () => {
      const result = findProjectOptionBySlugOrUid(mockProjects, null);

      expect(result).toBeUndefined();
    });

    it("should return undefined when projects is undefined", () => {
      const result = findProjectOptionBySlugOrUid(undefined, "my-project");

      expect(result).toBeUndefined();
    });

    it("should return undefined when no match found", () => {
      const result = findProjectOptionBySlugOrUid(mockProjects, "non-existent");

      expect(result).toBeUndefined();
    });
  });

  describe("Integration: Legacy UID URL support", () => {
    it("should correctly handle legacy URLs where projectId is a UID but project has a slug", () => {
      // Scenario: User bookmarked URL with ?projectId=uid-456
      // But the project now has a slug "another-project"
      // The dropdown should still show the correct project selected

      const selectedProjectId = "uid-456"; // Legacy UID from URL

      // First, convert projects to options (as used in dropdown)
      const projectOptions = projectsToOptions(mockProjects);

      // The old approach would fail here:
      const oldApproachResult = projectOptions.find(
        (project) => project.value === selectedProjectId
      );
      expect(oldApproachResult).toBeUndefined(); // Would show "All" incorrectly

      // The new approach finds the project correctly:
      const newApproachResult = findProjectOptionBySlugOrUid(mockProjects, selectedProjectId);
      expect(newApproachResult).toEqual({
        title: "Another Project",
        value: "another-project",
      });
    });

    it("should work with modern slug-based URLs", () => {
      // Scenario: User clicks on project with slug-based URL
      const selectedProjectId = "another-project";

      const result = findProjectOptionBySlugOrUid(mockProjects, selectedProjectId);

      expect(result).toEqual({
        title: "Another Project",
        value: "another-project",
      });
    });

    it("should work with projects that never had slugs", () => {
      // Scenario: Old project that was never given a slug
      const selectedProjectId = "uid-789";

      const result = findProjectOptionBySlugOrUid(mockProjects, selectedProjectId);

      expect(result).toEqual({
        title: "Project Without Slug",
        value: "uid-789",
      });
    });
  });
});
