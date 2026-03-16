/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual("@tanstack/react-query");
  return {
    ...actual,
    dehydrate: jest.fn(() => ({})),
    HydrationBoundary: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="hydration-boundary">{children}</div>
    ),
  };
});

jest.mock("@/components/Pages/Project/ProjectShareDialogMount", () => ({
  ProjectShareDialogMount: () => null,
}));

jest.mock("@/components/Utilities/E2EStoreExposer", () => ({
  E2EStoreExposer: () => null,
}));

jest.mock("@/utilities/queries/getProjectCachedData", () => ({
  getProjectCachedData: jest.fn(),
}));

jest.mock("@/utilities/queries/prefetchProjectProfile", () => ({
  prefetchProjectProfileData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/utilities/metadata/projectMetadata", () => ({
  generateProjectOverviewMetadata: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
  redirect: jest.fn(),
}));

import type { Project } from "@/types/v2/project";
import { getProjectCachedData } from "@/utilities/queries/getProjectCachedData";

const mockGetProjectCachedData = getProjectCachedData as jest.MockedFunction<
  typeof getProjectCachedData
>;

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    uid: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`,
    chainID: 10,
    owner: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`,
    details: {
      title: "Test Project Title",
      slug: "test-project",
      logoUrl: "https://example.com/logo.png",
    },
    members: [],
    pointers: [],
    createdAt: "2024-01-01",
    ...overrides,
  } as Project;
}

describe("Project Layout SSR LCP Shell", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = "false";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS;
  });

  async function renderLayout(projectId = "test-project") {
    const { default: RootLayout } = await import("@/app/project/[projectId]/layout");
    const element = await RootLayout({
      children: <div data-testid="children">Children</div>,
      params: Promise.resolve({ projectId }),
    });
    return render(element as React.ReactElement);
  }

  describe("when project data is available", () => {
    const mockProject = createMockProject();
    beforeEach(() => { mockGetProjectCachedData.mockResolvedValue(mockProject); });

    it("renders project title as an h1 in the SSR shell", async () => {
      await renderLayout();
      const heading = screen.getByRole("heading", { level: 1, hidden: true });
      expect(heading).toHaveTextContent("Test Project Title");
    });

    it("renders project logo as an img in the SSR shell", async () => {
      await renderLayout();
      const shell = document.getElementById("ssr-lcp-shell");
      expect(shell).not.toBeNull();
      const img = shell!.querySelector("img");
      expect(img).not.toBeNull();
      expect(img!.getAttribute("src")).toBe("https://example.com/logo.png");
    });

    it("has aria-hidden on the SSR shell", async () => {
      await renderLayout();
      const shell = document.getElementById("ssr-lcp-shell");
      expect(shell).toHaveAttribute("aria-hidden", "true");
    });

    it("includes a style tag to hide shell when client mounts", async () => {
      await renderLayout();
      const shell = document.getElementById("ssr-lcp-shell");
      const styleTag = shell!.querySelector("style");
      expect(styleTag).not.toBeNull();
      expect(styleTag!.textContent).toContain("project-profile-layout");
      expect(styleTag!.textContent).toContain("display: none");
    });

    it("renders the SSR shell inside the HydrationBoundary", async () => {
      await renderLayout();
      const boundary = screen.getByTestId("hydration-boundary");
      const shell = document.getElementById("ssr-lcp-shell");
      expect(boundary).toContainElement(shell);
    });

    it("renders the SSR shell before children", async () => {
      await renderLayout();
      const shell = document.getElementById("ssr-lcp-shell");
      const children = screen.getByTestId("children");
      const parent = shell!.parentElement!;
      const childNodes = Array.from(parent.children);
      expect(childNodes.indexOf(shell!)).toBeLessThan(childNodes.indexOf(children));
    });
  });

  describe("when project has no logo", () => {
    beforeEach(() => {
      mockGetProjectCachedData.mockResolvedValue(
        createMockProject({ details: { title: "No Logo Project", slug: "no-logo" } })
      );
    });

    it("renders title but no img", async () => {
      await renderLayout("no-logo");
      const heading = screen.getByRole("heading", { level: 1, hidden: true });
      expect(heading).toHaveTextContent("No Logo Project");
      const shell = document.getElementById("ssr-lcp-shell");
      expect(shell!.querySelector("img")).toBeNull();
    });
  });

  describe("when project data is not available", () => {
    beforeEach(() => { mockGetProjectCachedData.mockRejectedValue(new Error("Not found")); });

    it("does not render the SSR shell", async () => {
      await renderLayout();
      expect(document.getElementById("ssr-lcp-shell")).toBeNull();
    });
  });
});
