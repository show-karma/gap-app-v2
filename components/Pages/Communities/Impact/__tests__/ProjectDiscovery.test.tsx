import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ communityId: "test-community" }),
}));

// Mock fetchData to resolve immediately with empty arrays
jest.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue([[], null]),
}));

// Mock the Link component
jest.mock("@/src/components/navigation/Link", () => ({
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock formatCurrency
jest.mock("@/utilities/formatCurrency", () => ({
  __esModule: true,
  default: (val: number) => String(val),
}));

// Mock INDEXER
jest.mock("@/utilities/indexer", () => ({
  INDEXER: {
    COMMUNITY: {
      CATEGORIES: () => "/categories",
      PROGRAMS: () => "/programs",
      PROJECT_DISCOVERY: () => "/project-discovery",
    },
  },
}));

import { ProjectDiscovery } from "../ProjectDiscovery";

/**
 * Helper: collects all className strings from the rendered container.
 * Returns a single joined string for substring matching.
 */
function getAllClassNames(container: HTMLElement): string {
  const elements = container.querySelectorAll("[class]");
  return Array.from(elements)
    .map((el) => el.getAttribute("class") || "")
    .join(" ");
}

describe("ProjectDiscovery dark mode support", () => {
  it("should have dark: variants on the page heading", async () => {
    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText("Project Discovery")).toBeInTheDocument();
    });

    const heading = screen.getByText("Project Discovery");
    expect(heading.className).toContain("dark:");
  });

  it("should have dark: variants on the subtitle text", async () => {
    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText(/Discover projects based on/)).toBeInTheDocument();
    });

    const subtitle = screen.getByText(/Discover projects based on/);
    expect(subtitle.className).toContain("dark:");
  });

  it("should have dark: variants on label elements", async () => {
    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText("Category")).toBeInTheDocument();
    });

    const categoryLabel = screen.getByText("Category");
    expect(categoryLabel.className).toContain("dark:");

    const programLabel = screen.getByText("Program");
    expect(programLabel.className).toContain("dark:");

    const trustedCircleLabel = screen.getByText(/Trusted Circle/);
    expect(trustedCircleLabel.className).toContain("dark:");
  });

  it("should have dark:bg- classes on Listbox buttons", async () => {
    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText("Select Category")).toBeInTheDocument();
    });

    // The Listbox.Button renders as a button element
    const categoryButton = screen.getByText("Select Category").closest("button");
    expect(categoryButton).toBeTruthy();
    expect(categoryButton!.className).toContain("dark:bg-");

    const programButton = screen.getByText("Select Program").closest("button");
    expect(programButton).toBeTruthy();
    expect(programButton!.className).toContain("dark:bg-");
  });

  it("should have dark:text- classes on Listbox button text spans", async () => {
    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText("Select Category")).toBeInTheDocument();
    });

    const categorySpan = screen.getByText("Select Category");
    expect(categorySpan.className).toContain("dark:text-");

    const programSpan = screen.getByText("Select Program");
    expect(programSpan.className).toContain("dark:text-");
  });

  it("should have dark:border- classes on Listbox buttons", async () => {
    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText("Select Category")).toBeInTheDocument();
    });

    const categoryButton = screen.getByText("Select Category").closest("button");
    expect(categoryButton!.className).toContain("dark:border-");
  });

  it("should have dark: classes on the endorser input field", async () => {
    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter endorser address")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("Enter endorser address");
    expect(input.className).toContain("dark:bg-");
    expect(input.className).toContain("dark:border-");
    expect(input.className).toContain("dark:text-");
  });

  it("should have dark: class on the loading spinner text", async () => {
    // Force loading state by making fetchData never resolve
    const fetchData = require("@/utilities/fetchData").default;
    fetchData.mockReturnValue(new Promise(() => {}));

    const { container } = render(<ProjectDiscovery />);

    const loadingText = screen.getByText("Loading...");
    expect(loadingText.className).toContain("dark:");
  });

  it("should not have any bg-white without a corresponding dark:bg- class", async () => {
    // Reset mock to resolve
    const fetchData = require("@/utilities/fetchData").default;
    fetchData.mockResolvedValue([[], null]);

    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText("Project Discovery")).toBeInTheDocument();
    });

    const elementsWithBgWhite = container.querySelectorAll('[class*="bg-white"]');
    elementsWithBgWhite.forEach((el) => {
      const classes = el.getAttribute("class") || "";
      expect(classes).toMatch(/dark:bg-/);
    });
  });

  it("should not have any text-gray-900 without a corresponding dark:text- class", async () => {
    const fetchData = require("@/utilities/fetchData").default;
    fetchData.mockResolvedValue([[], null]);

    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText("Project Discovery")).toBeInTheDocument();
    });

    const elementsWithGray900 = container.querySelectorAll('[class*="text-gray-900"]');
    elementsWithGray900.forEach((el) => {
      const classes = el.getAttribute("class") || "";
      expect(classes).toMatch(/dark:text-/);
    });
  });

  it("should not have any text-gray-700 without a corresponding dark:text- class", async () => {
    const fetchData = require("@/utilities/fetchData").default;
    fetchData.mockResolvedValue([[], null]);

    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText("Project Discovery")).toBeInTheDocument();
    });

    const elementsWithGray700 = container.querySelectorAll('[class*="text-gray-700"]');
    elementsWithGray700.forEach((el) => {
      const classes = el.getAttribute("class") || "";
      expect(classes).toMatch(/dark:text-/);
    });
  });

  it("should not have any border-gray-200 without a corresponding dark:border- class", async () => {
    const fetchData = require("@/utilities/fetchData").default;
    fetchData.mockResolvedValue([[], null]);

    const { container } = render(<ProjectDiscovery />);

    await waitFor(() => {
      expect(screen.getByText("Project Discovery")).toBeInTheDocument();
    });

    const elementsWithBorder = container.querySelectorAll('[class*="border-gray-200"]');
    elementsWithBorder.forEach((el) => {
      const classes = el.getAttribute("class") || "";
      expect(classes).toMatch(/dark:border-/);
    });
  });
});
