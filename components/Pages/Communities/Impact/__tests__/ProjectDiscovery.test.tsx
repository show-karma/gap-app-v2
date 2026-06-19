import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "test-community" }),
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/utilities/formatCurrency", () => ({
  __esModule: true,
  default: (val: number) => String(val),
}));

vi.mock("@/utilities/pages", () => ({
  PAGES: {
    ADMIN: {
      EDIT_CATEGORIES: (community: string) => `/community/${community}/manage/edit-categories`,
    },
    PROJECT: {
      OVERVIEW: (project: string) => `/project/${project}`,
      GRANT: (project: string, grant: string) => `/project/${project}/funding/${grant}`,
    },
  },
}));

vi.mock("@/hooks/communities/useCommunityCategories", () => ({
  useCommunityCategories: vi.fn(),
}));
vi.mock("@/hooks/usePrograms", () => ({
  useCommunityPrograms: vi.fn(),
}));
vi.mock("@/hooks/communities/useIsCommunityAdmin", () => ({
  useIsCommunityAdmin: vi.fn(),
}));
vi.mock("@/hooks/communities/useProjectDiscovery", () => ({
  useProjectDiscovery: vi.fn(),
}));

import { useCommunityCategories } from "@/hooks/communities/useCommunityCategories";
import { useIsCommunityAdmin } from "@/hooks/communities/useIsCommunityAdmin";
import { useProjectDiscovery } from "@/hooks/communities/useProjectDiscovery";
import { useCommunityPrograms } from "@/hooks/usePrograms";
import { ProjectDiscovery } from "../ProjectDiscovery";

const mockedCategories = vi.mocked(useCommunityCategories);
const mockedPrograms = vi.mocked(useCommunityPrograms);
const mockedIsAdmin = vi.mocked(useIsCommunityAdmin);
const mockedDiscovery = vi.mocked(useProjectDiscovery);

type QueryStub = {
  data?: unknown;
  isLoading?: boolean;
  isError?: boolean;
  refetch?: () => void;
};

function categoriesQuery(overrides: QueryStub = {}) {
  mockedCategories.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useCommunityCategories>);
}

function programsQuery(overrides: QueryStub = {}) {
  mockedPrograms.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useCommunityPrograms>);
}

function adminStub(isCommunityAdmin = false) {
  mockedIsAdmin.mockReturnValue({
    isCommunityAdmin,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useIsCommunityAdmin>);
}

const mutateSpy = vi.fn();
function discoveryStub(overrides: { data?: unknown; isPending?: boolean; isError?: boolean } = {}) {
  mockedDiscovery.mockReturnValue({
    mutate: mutateSpy,
    data: undefined,
    isPending: false,
    isError: false,
    ...overrides,
  } as unknown as ReturnType<typeof useProjectDiscovery>);
}

const sampleCategory = {
  id: "cat-1",
  name: "DeFi",
  impact_segments: [
    {
      id: "seg-1",
      name: "Segment",
      description: "",
      type: "output" as const,
      impact_indicators: [
        { id: "ind-1", name: "Indicator One", description: "", unitOfMeasure: "count" },
      ],
    },
  ],
};

const sampleProgram = {
  _id: "p-1",
  programId: "program-1",
  chainID: 10,
  metadata: { title: "Optimism RetroPGF" },
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  categoriesQuery();
  programsQuery();
  adminStub(false);
  discoveryStub();
});

describe("ProjectDiscovery loading & error states", () => {
  it("renders a spinner while filters load", () => {
    categoriesQuery({ isLoading: true });
    render(<ProjectDiscovery />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders an error block with Retry wired to the failing query's refetch", () => {
    const refetch = vi.fn();
    categoriesQuery({ isError: true, refetch });
    render(<ProjectDiscovery />);

    expect(screen.queryByText(/No impact categories have been configured/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe("ProjectDiscovery empty categories state", () => {
  it("shows the empty copy, disables the Listbox button and links describedby help", () => {
    categoriesQuery({ data: [] });
    programsQuery({ data: [sampleProgram] });
    render(<ProjectDiscovery />);

    expect(
      screen.getByText("No impact categories have been configured for this community yet.")
    ).toBeInTheDocument();
    const button = screen.getByText("No categories available").closest("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-describedby", "category-select-empty-help");
  });

  it("shows the Configure categories CTA only for community admins", () => {
    categoriesQuery({ data: [] });
    adminStub(true);
    render(<ProjectDiscovery />);

    const cta = screen.getByText("Configure categories");
    expect(cta).toBeInTheDocument();
    expect(cta.closest("a")).toHaveAttribute(
      "href",
      "/community/test-community/manage/edit-categories"
    );
  });

  it("hides the Configure categories CTA for non-admins", () => {
    categoriesQuery({ data: [] });
    adminStub(false);
    render(<ProjectDiscovery />);
    expect(screen.queryByText("Configure categories")).not.toBeInTheDocument();
  });
});

describe("ProjectDiscovery happy path & search", () => {
  it("renders the program label from metadata.title (regression for #1326)", async () => {
    categoriesQuery({ data: [sampleCategory] });
    programsQuery({ data: [sampleProgram] });
    render(<ProjectDiscovery />);

    // The option text comes from metadata.title, not a top-level `name`.
    fireEvent.click(screen.getByText("Select Program"));
    fireEvent.click(await screen.findByText("Optimism RetroPGF"));

    // After selection the trigger displays the metadata.title label.
    expect(screen.getByText("Optimism RetroPGF")).toBeInTheDocument();
  });

  it("enables Discover Projects after selecting a category and program, and calls mutate", async () => {
    categoriesQuery({ data: [sampleCategory] });
    programsQuery({ data: [sampleProgram] });
    render(<ProjectDiscovery />);

    fireEvent.click(screen.getByText("Select Category"));
    fireEvent.click(await screen.findByText("DeFi"));

    fireEvent.click(screen.getByText("Select Program"));
    fireEvent.click(await screen.findByText("Optimism RetroPGF"));

    const cta = screen.getByRole("button", { name: "Discover Projects" });
    await waitFor(() => expect(cta).not.toBeDisabled());

    fireEvent.click(cta);
    expect(mutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ programId: "program-1", categoryId: "cat-1" })
    );
  });
});

describe("ProjectDiscovery results panel states", () => {
  it("shows the pre-search prompt when no search has run", () => {
    render(<ProjectDiscovery />);
    expect(
      screen.getByText("Select a category and program, then discover projects")
    ).toBeInTheDocument();
  });

  it("shows the searched-but-empty state when results are an empty array", () => {
    discoveryStub({ data: [] });
    render(<ProjectDiscovery />);
    expect(screen.getByText("No projects matched these filters")).toBeInTheDocument();
    expect(
      screen.queryByText("Select a category and program, then discover projects")
    ).not.toBeInTheDocument();
  });

  it("renders a results-panel error with Retry on mutation error", () => {
    discoveryStub({ isError: true });
    render(<ProjectDiscovery />);
    expect(screen.getByText("We couldn't run the discovery search.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders results with a project count", () => {
    discoveryStub({
      data: [
        {
          project: {
            grantId: "g",
            programId: "p",
            grantUID: "gu",
            chainID: 10,
            grantTitle: "Grant",
            projectUID: "pu",
            projectTitle: "Project One",
            projectSlug: "project-one",
            projectEndorsers: [],
          },
          impactScore: 42,
          impact: [],
        },
      ],
    });
    render(<ProjectDiscovery />);
    expect(screen.getByText("Project One")).toBeInTheDocument();
    expect(screen.getByText("1 project found")).toBeInTheDocument();
  });
});

describe("ProjectDiscovery dark mode support", () => {
  beforeEach(() => {
    categoriesQuery({ data: [] });
    programsQuery({ data: [] });
  });

  it("has dark: variants on the page heading and subtitle", () => {
    render(<ProjectDiscovery />);
    expect(screen.getByText("Project Discovery").className).toContain("dark:");
    expect(screen.getByText(/Discover projects based on/).className).toContain("dark:");
  });

  it("has dark: variants on label elements", () => {
    render(<ProjectDiscovery />);
    expect(screen.getByText("Category").className).toContain("dark:");
    expect(screen.getByText("Program").className).toContain("dark:");
    expect(screen.getByText(/Trusted Circle/).className).toContain("dark:");
  });

  it("has dark: classes on the endorser input field", () => {
    render(<ProjectDiscovery />);
    const input = screen.getByPlaceholderText("Enter endorser address");
    expect(input.className).toContain("dark:bg-");
    expect(input.className).toContain("dark:border-");
    expect(input.className).toContain("dark:text-");
  });

  it("has a dark: class on the loading spinner text", () => {
    categoriesQuery({ isLoading: true });
    render(<ProjectDiscovery />);
    expect(screen.getByText("Loading...").className).toContain("dark:");
  });

  it("has no bg-white without a corresponding dark:bg- class", () => {
    const { container } = render(<ProjectDiscovery />);
    container.querySelectorAll('[class*="bg-white"]').forEach((el) => {
      expect(el.getAttribute("class") || "").toMatch(/dark:bg-/);
    });
  });

  it("has no text-gray-900 without a corresponding dark:text- class", () => {
    const { container } = render(<ProjectDiscovery />);
    container.querySelectorAll('[class*="text-gray-900"]').forEach((el) => {
      expect(el.getAttribute("class") || "").toMatch(/dark:text-/);
    });
  });

  it("has no border-gray-200 without a corresponding dark:border- class", () => {
    const { container } = render(<ProjectDiscovery />);
    container.querySelectorAll('[class*="border-gray-200"]').forEach((el) => {
      expect(el.getAttribute("class") || "").toMatch(/dark:border-/);
    });
  });
});
