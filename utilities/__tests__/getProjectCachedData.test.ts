import type { Project } from "@/types/v2/project";

const mockGetProject = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockRedirect = vi.fn();

vi.mock("@/services/project.service", () => ({
  getProject: (...args: unknown[]) => mockGetProject(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    uid: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`,
    chainID: 10,
    owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`,
    details: {
      title: "Test Project",
      slug: "test-project",
    },
    members: [],
    pointers: [],
    createdAt: "2024-01-01",
    ...overrides,
  } as Project;
}

describe("getProjectCachedData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loadModule() {
    vi.resetModules();
    return import("@/utilities/queries/getProjectCachedData");
  }

  it("returns project data for a valid slug", async () => {
    mockGetProject.mockResolvedValue(createMockProject());

    const { getProjectCachedData } = await loadModule();
    const result = await getProjectCachedData("test-project");

    expect(mockGetProject).toHaveBeenCalledWith("test-project");
    expect(result.details.slug).toBe("test-project");
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("short-circuits malformed placeholder slugs before fetching project data", async () => {
    const { getProjectCachedData } = await loadModule();

    await expect(getProjectCachedData("-nan-12")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockGetProject).not.toHaveBeenCalled();
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });
});
