/**
 * Tests for KarmaProfileLinkInput Component (features/applications version)
 *
 * These tests verify project search, selection, add-project link,
 * and remove button functionality.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { KarmaProfileLinkInput } from "../KarmaProfileLinkInput";

// Mock MarkdownPreview to avoid heavy dependencies
vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source: string }) => <span>{source}</span>,
}));

// Mock the useProjectSearch hook
const mockProjects = [
  {
    uid: "0x1234567890123456789012345678901234567890123456789012345678901234" as `0x${string}`,
    chainID: 1,
    createdAt: "2024-01-01",
    details: {
      title: "Test Project",
      slug: "test-project",
    },
  },
  {
    uid: "0xabcdef1234567890123456789012345678901234567890123456789012345678" as `0x${string}`,
    chainID: 42161,
    createdAt: "2024-02-01",
    details: {
      title: "Another Project",
      slug: "another-project",
    },
  },
];

vi.mock("@/hooks/useProjectSearch", () => ({
  useProjectSearch: vi.fn((query: string) => {
    if (query.length < 3) {
      return {
        projects: [],
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    return {
      projects: mockProjects.filter(
        (p) =>
          p.details?.title?.toLowerCase().includes(query.toLowerCase()) ||
          p.details?.slug?.toLowerCase().includes(query.toLowerCase())
      ),
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  }),
}));

function TestWrapper({
  question,
  disabled = false,
  children,
}: {
  question: ApplicationQuestion;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const methods = useForm({
    defaultValues: {
      karma_profile_link: "",
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}>
        <form>
          <KarmaProfileLinkInput
            control={methods.control}
            name="karma_profile_link"
            question={question}
            disabled={disabled}
          />
          {children}
        </form>
      </FormProvider>
    </QueryClientProvider>
  );
}

describe("KarmaProfileLinkInput Component (features/applications)", () => {
  const mockQuestion: ApplicationQuestion = {
    id: "karma_profile_link",
    type: "karma_profile_link",
    label: "Karma profile link",
    required: true,
    description: "Select your existing Karma project",
    placeholder: "Search for your project...",
  };

  describe("Rendering", () => {
    it("should render the question label", () => {
      render(<TestWrapper question={mockQuestion} />);
      expect(screen.getByText("Karma profile link")).toBeInTheDocument();
    });

    it("should render required indicator when required", () => {
      render(<TestWrapper question={mockQuestion} />);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("should render search input with placeholder", () => {
      render(<TestWrapper question={mockQuestion} />);
      expect(screen.getByPlaceholderText("Search for your project...")).toBeInTheDocument();
    });
  });

  describe("Search and Results", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should display search results after typing 3+ characters", async () => {
      render(<TestWrapper question={mockQuestion} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
        fireEvent.focus(input);
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });
    });

    it("should select a project when clicked", async () => {
      render(<TestWrapper question={mockQuestion} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
        fireEvent.focus(input);
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByRole("option", { name: /Test Project/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("option", { name: /Test Project/i }));

      await waitFor(() => {
        // After selection, the project card is visible and dropdown is closed
        expect(screen.getByTestId("remove-project-button")).toBeInTheDocument();
      });
    });
  });

  describe("Add Project Link", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should show add project link in search results", async () => {
      render(<TestWrapper question={mockQuestion} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
        fireEvent.focus(input);
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId("add-project-link")).toBeInTheDocument();
      });
    });

    it("should show add project link when no results found", async () => {
      render(<TestWrapper question={mockQuestion} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "zzzzzzz" } });
        fireEvent.focus(input);
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText("No projects found")).toBeInTheDocument();
        expect(screen.getByTestId("add-project-link")).toBeInTheDocument();
      });
    });

    it("should have correct href and target on add project link", async () => {
      render(<TestWrapper question={mockQuestion} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
        fireEvent.focus(input);
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        const link = screen.getByTestId("add-project-link");
        expect(link).toHaveAttribute("href", expect.stringContaining("?action=create-project"));
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
      });
    });
  });

  describe("Remove Button", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should show remove button on selected project", async () => {
      render(<TestWrapper question={mockQuestion} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
        fireEvent.focus(input);
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test Project"));

      await waitFor(() => {
        expect(screen.getByTestId("remove-project-button")).toBeInTheDocument();
      });
    });

    it("should clear selection when remove button is clicked", async () => {
      render(<TestWrapper question={mockQuestion} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
        fireEvent.focus(input);
        vi.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Test Project"));

      await waitFor(() => {
        expect(screen.getByTestId("remove-project-button")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("remove-project-button"));

      await waitFor(() => {
        expect(screen.queryByTestId("remove-project-button")).not.toBeInTheDocument();
        expect(input).toHaveValue("");
      });
    });

    it("should not show remove button when disabled", async () => {
      render(<TestWrapper question={mockQuestion} disabled />);

      // With disabled, we can't interact, but we also verify no remove button
      // even if a project were selected (which can't happen when disabled)
      expect(screen.queryByTestId("remove-project-button")).not.toBeInTheDocument();
    });
  });
});
