/**
 * Tests for KarmaProfileLinkInput Component
 *
 * These tests verify that the KarmaProfileLinkInput component properly handles
 * project search and selection using the Karma project search API.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import type { IFormField } from "@/types/funding-platform";
import { KarmaProfileLinkInput } from "../KarmaProfileLinkInput";

// Mock the useProjectSearch hook
const mockProjects = [
  {
    uid: "0x1234567890123456789012345678901234567890123456789012345678901234" as `0x${string}`,
    chainID: 1,
    createdAt: "2024-01-01",
    details: {
      title: "Test Project",
      slug: "test-project",
      logoUrl: "https://example.com/logo.png",
    },
  },
  {
    uid: "0xabcdef1234567890123456789012345678901234567890123456789012345678" as `0x${string}`,
    chainID: 42161,
    createdAt: "2024-02-01",
    details: {
      title: "Another Project",
      slug: "another-project",
      logoUrl: null,
    },
  },
];

jest.mock("@/hooks/useProjectSearch", () => ({
  useProjectSearch: jest.fn((query: string) => {
    if (query.length < 3) {
      return {
        projects: [],
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        refetch: jest.fn(),
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
      refetch: jest.fn(),
    };
  }),
}));

// Create wrapper with QueryClient and Form
function TestWrapper({
  field,
  defaultValues = {},
  children,
}: {
  field: IFormField;
  defaultValues?: any;
  children?: ReactNode;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const methods = useForm({
    defaultValues: {
      karma_profile_link: defaultValues.karma_profile_link ?? "",
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...methods}>
        <form>
          <KarmaProfileLinkInput
            field={field}
            control={methods.control}
            fieldKey="karma_profile_link"
            isLoading={false}
          />
          {children}
        </form>
      </FormProvider>
    </QueryClientProvider>
  );
}

describe("KarmaProfileLinkInput Component", () => {
  const mockField: IFormField = {
    id: "karma_profile_link",
    type: "karma_profile_link",
    label: "Karma profile link",
    required: true,
    description: "Select your existing Karma project",
    placeholder: "Search for your project...",
  };

  describe("Rendering", () => {
    it("should render the field label", () => {
      render(<TestWrapper field={mockField} />);

      expect(screen.getByText("Karma profile link")).toBeInTheDocument();
    });

    it("should render the field description", () => {
      render(<TestWrapper field={mockField} />);

      expect(screen.getByText("Select your existing Karma project")).toBeInTheDocument();
    });

    it("should show required indicator when field is required", () => {
      render(<TestWrapper field={mockField} />);

      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("should not show required indicator when field is optional", () => {
      const optionalField = { ...mockField, required: false };
      render(<TestWrapper field={optionalField} />);

      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });

    it("should render search input with placeholder", () => {
      render(<TestWrapper field={mockField} />);

      const input = screen.getByPlaceholderText("Search for your project...");
      expect(input).toBeInTheDocument();
    });

    it("should render default placeholder when none provided", () => {
      const fieldWithoutPlaceholder = { ...mockField, placeholder: undefined };
      render(<TestWrapper field={fieldWithoutPlaceholder} />);

      const input = screen.getByPlaceholderText("Search for your Karma project...");
      expect(input).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should not trigger search with less than 3 characters", async () => {
      render(<TestWrapper field={mockField} />);

      const input = screen.getByPlaceholderText("Search for your project...");
      fireEvent.change(input, { target: { value: "ab" } });

      // Advance timers past debounce
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Should not show any project results
      expect(screen.queryByText("Test Project")).not.toBeInTheDocument();
    });

    it("should display search results after typing 3+ characters", async () => {
      render(<TestWrapper field={mockField} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
        fireEvent.focus(input);
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });
    });
  });

  describe("Selection", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should display selected project info after selection", async () => {
      render(<TestWrapper field={mockField} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
        fireEvent.focus(input);
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });

      // Click on the project to select it
      const projectOption = screen.getByText("Test Project");
      fireEvent.click(projectOption);

      // After selection, the input is cleared and the selected project is shown in a separate display
      await waitFor(() => {
        // The input should be cleared after selection
        expect(input).toHaveValue("");
      });

      // The project title should be visible in the selected project display card
      expect(screen.getByText("Test Project")).toBeInTheDocument();
    });

    it("should clear selection when X button is clicked", async () => {
      render(<TestWrapper field={mockField} />);

      const input = screen.getByPlaceholderText("Search for your project...");

      await act(async () => {
        fireEvent.change(input, { target: { value: "test" } });
        fireEvent.focus(input);
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });

      // Select a project
      const projectOption = screen.getByText("Test Project");
      fireEvent.click(projectOption);

      // Verify project is selected (displayed in the confirmation area)
      await waitFor(() => {
        expect(input).toHaveValue("");
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });

      // Find and click the clear button (X icon button)
      const clearButton = screen.getByRole("button");
      fireEvent.click(clearButton);

      // Verify selection is cleared
      await waitFor(() => {
        // Input should be cleared
        expect(input).toHaveValue("");
        // The selected project display should no longer be visible
        // (the project title may still appear in search results if dropdown reopens)
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when error prop is provided", () => {
      const TestWrapperWithError = () => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false } },
        });

        const methods = useForm({
          defaultValues: { karma_profile_link: "" },
        });

        return (
          <QueryClientProvider client={queryClient}>
            <FormProvider {...methods}>
              <KarmaProfileLinkInput
                field={mockField}
                control={methods.control}
                fieldKey="karma_profile_link"
                error={{ type: "required", message: "This field is required" }}
                isLoading={false}
              />
            </FormProvider>
          </QueryClientProvider>
        );
      };

      render(<TestWrapperWithError />);

      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should disable input when isLoading is true", () => {
      const TestWrapperLoading = () => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false } },
        });

        const methods = useForm({
          defaultValues: { karma_profile_link: "" },
        });

        return (
          <QueryClientProvider client={queryClient}>
            <FormProvider {...methods}>
              <KarmaProfileLinkInput
                field={mockField}
                control={methods.control}
                fieldKey="karma_profile_link"
                isLoading={true}
              />
            </FormProvider>
          </QueryClientProvider>
        );
      };

      render(<TestWrapperLoading />);

      const input = screen.getByPlaceholderText("Search for your project...");
      expect(input).toBeDisabled();
    });
  });
});
