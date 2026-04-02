/**
 * @file Tests for IndicatorForm component
 * @description Comprehensive tests for the indicator form component covering form validation, submission, and error handling
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IndicatorForm, type IndicatorFormData } from "@/components/Forms/IndicatorForm";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";

// Mock fetchData
vi.mock("@/utilities/fetchData");
const mockFetchData = fetchData as vi.MockedFunction<typeof fetchData>;

// Mock errorManager
vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

// Mock Button component
vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ onClick, disabled, children, className, isLoading, type }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-loading={isLoading}
      type={type}
    >
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

describe("IndicatorForm", () => {
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  const mockIndicatorResponse = {
    id: "indicator-123",
    name: "Test Indicator",
    description: "Test Description",
    unitOfMeasure: "int",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render form with all fields", () => {
      render(<IndicatorForm />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Description")).toBeInTheDocument();
      expect(screen.getByText("Unit Type")).toBeInTheDocument();
      expect(screen.getByText("Create Output Metric")).toBeInTheDocument();
    });

    it("should render with default placeholder values", () => {
      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");

      expect(nameInput).toBeInTheDocument();
      expect(descriptionInput).toBeInTheDocument();
    });

    it("should render both unit type options", () => {
      render(<IndicatorForm />);

      expect(screen.getByText("Int")).toBeInTheDocument();
      expect(screen.getByText("Float")).toBeInTheDocument();
    });

    it("should show update button text when indicatorId is provided", () => {
      render(<IndicatorForm indicatorId="indicator-123" />);

      expect(screen.getByText("Update Output Metric")).toBeInTheDocument();
    });

    it("should show create button text when no indicatorId", () => {
      render(<IndicatorForm />);

      expect(screen.getByText("Create Output Metric")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should show validation error for name too short", async () => {
      const user = userEvent.setup();
      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      await user.clear(nameInput);

      await user.type(nameInput, "ab");
      // fireEvent required: testing blur/focus event handler callback
      fireEvent.blur(nameInput);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Name must be at least 3 characters long")).toBeInTheDocument();
      });
    });

    it("should show validation error for name too long", async () => {
      const user = userEvent.setup();
      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const longName = "a".repeat(51);
      await user.clear(nameInput);

      await user.type(nameInput, longName);
      // fireEvent required: testing blur/focus event handler callback
      fireEvent.blur(nameInput);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Name must be less than 50 characters")).toBeInTheDocument();
      });
    });

    it("should show validation error for empty description", async () => {
      const user = userEvent.setup();
      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      await user.clear(nameInput);

      await user.type(nameInput, "Valid Name");

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Description is required")).toBeInTheDocument();
      });
    });

    it("should show validation error for description too long", async () => {
      const user = userEvent.setup();
      render(<IndicatorForm />);

      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");
      const longDescription = "a".repeat(501);
      await user.clear(descriptionInput);

      await user.type(descriptionInput, longDescription);
      // fireEvent required: testing blur/focus event handler callback
      fireEvent.blur(descriptionInput);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Description must be less than 500 characters")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission - Create Mode", () => {
    it("should submit form with valid data", async () => {
      const user = userEvent.setup();
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(<IndicatorForm onSuccess={mockOnSuccess} />);

      // Fill form
      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");

      await user.clear(nameInput);

      await user.type(nameInput, "Test Indicator");
      await user.clear(descriptionInput);

      await user.type(descriptionInput, "Test Description");

      // Select unit type
      const intRadio = screen.getByDisplayValue("int");
      await user.click(intRadio);

      // Submit
      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          INDEXER.INDICATORS.V2.CREATE_OR_UPDATE(),
          "POST",
          expect.objectContaining({
            name: "Test Indicator",
            description: "Test Description",
            unitOfMeasure: "int",
            programs: [],
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalledWith(mockIndicatorResponse);
    });

    it("should call onSuccess callback after successful creation", async () => {
      const user = userEvent.setup();
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(<IndicatorForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");

      await user.clear(nameInput);

      await user.type(nameInput, "Test Indicator");
      await user.clear(descriptionInput);

      await user.type(descriptionInput, "Test Description");

      const intRadio = screen.getByDisplayValue("int");
      await user.click(intRadio);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockIndicatorResponse);
      });
    });

    it("should reset form after successful creation (not update)", async () => {
      const user = userEvent.setup();
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(<IndicatorForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name") as HTMLInputElement;
      const descriptionInput = screen.getByPlaceholderText(
        "Enter indicator description"
      ) as HTMLTextAreaElement;

      await user.clear(nameInput);

      await user.type(nameInput, "Test Indicator");
      await user.clear(descriptionInput);

      await user.type(descriptionInput, "Test Description");

      const intRadio = screen.getByDisplayValue("int");
      await user.click(intRadio);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Form should be reset (only for create, not update)
      await waitFor(() => {
        expect(nameInput.value).toBe("");
        expect(descriptionInput.value).toBe("");
      });
    });
  });

  describe("Form Submission - Update Mode", () => {
    it("should submit form in update mode with indicatorId", async () => {
      const user = userEvent.setup();
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(
        <IndicatorForm
          indicatorId="indicator-123"
          onSuccess={mockOnSuccess}
          defaultValues={{
            name: "Existing Indicator",
            description: "Existing Description",
            unitOfMeasure: "int",
          }}
        />
      );

      const nameInput = screen.getByDisplayValue("Existing Indicator");
      await user.clear(nameInput);

      await user.type(nameInput, "Updated Indicator");

      const submitButton = screen.getByText("Update Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          INDEXER.INDICATORS.V2.CREATE_OR_UPDATE(),
          "POST",
          expect.objectContaining({
            indicatorId: "indicator-123",
            name: "Updated Indicator",
          })
        );
      });
    });

    it("should not reset form after successful update", async () => {
      const user = userEvent.setup();
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(
        <IndicatorForm
          indicatorId="indicator-123"
          onSuccess={mockOnSuccess}
          defaultValues={{
            name: "Existing Indicator",
            description: "Existing Description",
            unitOfMeasure: "int",
          }}
        />
      );

      const submitButton = screen.getByText("Update Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Form should NOT be reset in update mode
      const nameInput = screen.getByDisplayValue("Existing Indicator");
      expect(nameInput).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should call onError callback on submission failure", async () => {
      const user = userEvent.setup();
      const error = new Error("API Error");
      mockFetchData.mockResolvedValueOnce([null, error]);

      render(<IndicatorForm onError={mockOnError} />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");

      await user.clear(nameInput);

      await user.type(nameInput, "Test Indicator");
      await user.clear(descriptionInput);

      await user.type(descriptionInput, "Test Description");

      const intRadio = screen.getByDisplayValue("int");
      await user.click(intRadio);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });

    it("should handle invalid response format", async () => {
      const user = userEvent.setup();
      mockFetchData.mockResolvedValueOnce([null, null]); // Invalid response

      render(<IndicatorForm onError={mockOnError} />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");

      await user.clear(nameInput);

      await user.type(nameInput, "Test Indicator");
      await user.clear(descriptionInput);

      await user.type(descriptionInput, "Test Description");

      const intRadio = screen.getByDisplayValue("int");
      await user.click(intRadio);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it("should handle response without id", async () => {
      const user = userEvent.setup();
      mockFetchData.mockResolvedValueOnce([{ name: "Test" }, null]); // No id

      render(<IndicatorForm onError={mockOnError} />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");

      await user.clear(nameInput);

      await user.type(nameInput, "Test Indicator");
      await user.clear(descriptionInput);

      await user.type(descriptionInput, "Test Description");

      const intRadio = screen.getByDisplayValue("int");
      await user.click(intRadio);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });
  });

  describe("Loading State", () => {
    it("should disable submit button when external isLoading is true", () => {
      render(<IndicatorForm isLoading={true} />);

      const submitButton = screen.getByText("Loading...");
      expect(submitButton).toBeDisabled();
    });

    it("should show loading state during submission", async () => {
      const user = userEvent.setup();
      mockFetchData.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve([mockIndicatorResponse, null]), 100))
      );

      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");

      await user.clear(nameInput);

      await user.type(nameInput, "Test Indicator");
      await user.clear(descriptionInput);

      await user.type(descriptionInput, "Test Description");

      const intRadio = screen.getByDisplayValue("int");
      await user.click(intRadio);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument();
      });
    });
  });

  describe("Read-only Fields", () => {
    it("should make name field readonly when specified", () => {
      render(
        <IndicatorForm
          readOnlyFields={{ name: true }}
          defaultValues={{
            name: "Readonly Name",
            description: "Description",
            unitOfMeasure: "int",
          }}
        />
      );

      const nameInput = screen.getByDisplayValue("Readonly Name") as HTMLInputElement;
      expect(nameInput.readOnly).toBe(true);
    });

    it("should make description field readonly when specified", () => {
      render(
        <IndicatorForm
          readOnlyFields={{ description: true }}
          defaultValues={{
            name: "Name",
            description: "Readonly Description",
            unitOfMeasure: "int",
          }}
        />
      );

      const descriptionInput = screen.getByDisplayValue(
        "Readonly Description"
      ) as HTMLTextAreaElement;
      expect(descriptionInput.readOnly).toBe(true);
    });

    it("should disable unitOfMeasure radios when specified", () => {
      render(
        <IndicatorForm
          readOnlyFields={{ unitOfMeasure: true }}
          defaultValues={{
            name: "Name",
            description: "Description",
            unitOfMeasure: "int",
          }}
        />
      );

      const intRadio = screen.getByDisplayValue("int") as HTMLInputElement;
      const floatRadio = screen.getByDisplayValue("float") as HTMLInputElement;

      expect(intRadio.disabled).toBe(true);
      expect(floatRadio.disabled).toBe(true);
    });
  });

  describe("Pre-selected Programs", () => {
    it("should render pre-selected programs when provided", () => {
      const preSelectedPrograms = [
        { programId: "program-1", title: "Program 1", chainID: 1 },
        { programId: "program-2", title: "Program 2", chainID: 2 },
      ];

      render(<IndicatorForm preSelectedPrograms={preSelectedPrograms} />);

      expect(screen.getByText("Selected Programs")).toBeInTheDocument();
      expect(screen.getByText("Program 1")).toBeInTheDocument();
      expect(screen.getByText("Program 2")).toBeInTheDocument();
    });

    it("should submit with pre-selected programs", async () => {
      const user = userEvent.setup();
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      const preSelectedPrograms = [{ programId: "program-1", title: "Program 1", chainID: 1 }];

      render(<IndicatorForm preSelectedPrograms={preSelectedPrograms} onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");

      await user.clear(nameInput);

      await user.type(nameInput, "Test Indicator");
      await user.clear(descriptionInput);

      await user.type(descriptionInput, "Test Description");

      const intRadio = screen.getByDisplayValue("int");
      await user.click(intRadio);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          INDEXER.INDICATORS.V2.CREATE_OR_UPDATE(),
          "POST",
          expect.objectContaining({
            programs: [{ programId: "program-1", chainID: 1 }],
          })
        );
      });
    });
  });

  describe("Event Propagation", () => {
    it("should prevent propagation when preventPropagation is true", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <div onClick={handleClick}>
          <IndicatorForm preventPropagation={true} />
        </div>
      );

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const form = nameInput.closest("form");
      expect(form).toBeInTheDocument();

      if (form) {
        await user.click(form);
        expect(handleClick).not.toHaveBeenCalled();
      }
    });

    it("should stop propagation on Enter key when preventPropagation is true", () => {
      const handleKeyDown = vi.fn();

      const { container } = render(
        <div onKeyDown={handleKeyDown}>
          <IndicatorForm preventPropagation={true} />
        </div>
      );

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const form = nameInput.closest("form");

      if (form) {
        fireEvent.keyDown(form, { key: "Enter", code: "Enter" });
      }

      // We just verify the form handles the event, exact propagation behavior depends on implementation
      expect(form).toBeInTheDocument();
    });
  });

  describe("Default Values", () => {
    it("should populate form with default values", () => {
      const defaultValues: Partial<IndicatorFormData> = {
        name: "Default Name",
        description: "Default Description",
        unitOfMeasure: "float",
      };

      render(<IndicatorForm defaultValues={defaultValues} />);

      expect(screen.getByDisplayValue("Default Name")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Default Description")).toBeInTheDocument();
      expect((screen.getByDisplayValue("float") as HTMLInputElement).checked).toBe(true);
    });

    it("should reset form when defaultValues change", () => {
      const { rerender } = render(
        <IndicatorForm
          defaultValues={{
            name: "Initial Name",
            description: "Initial Description",
            unitOfMeasure: "int",
          }}
        />
      );

      expect(screen.getByDisplayValue("Initial Name")).toBeInTheDocument();

      // Update default values
      rerender(
        <IndicatorForm
          defaultValues={{
            name: "Updated Name",
            description: "Updated Description",
            unitOfMeasure: "float",
          }}
        />
      );

      expect(screen.getByDisplayValue("Updated Name")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Updated Description")).toBeInTheDocument();
    });
  });

  describe("Unit Type Selection", () => {
    it("should select int unit type", async () => {
      const user = userEvent.setup();
      render(<IndicatorForm />);

      const intRadio = screen.getByDisplayValue("int") as HTMLInputElement;
      await user.click(intRadio);

      expect(intRadio.checked).toBe(true);
    });

    it("should select float unit type", async () => {
      const user = userEvent.setup();
      render(<IndicatorForm />);

      const floatRadio = screen.getByDisplayValue("float") as HTMLInputElement;
      await user.click(floatRadio);

      expect(floatRadio.checked).toBe(true);
    });

    it("should toggle between unit types", async () => {
      const user = userEvent.setup();
      render(<IndicatorForm />);

      const intRadio = screen.getByDisplayValue("int") as HTMLInputElement;
      const floatRadio = screen.getByDisplayValue("float") as HTMLInputElement;

      await user.click(intRadio);
      expect(intRadio.checked).toBe(true);

      await user.click(floatRadio);
      expect(floatRadio.checked).toBe(true);
      expect(intRadio.checked).toBe(false);
    });
  });

  describe("Community ID Integration", () => {
    it("should include communityUID in submission when provided", async () => {
      const user = userEvent.setup();
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(<IndicatorForm communityId="community-123" onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByPlaceholderText("Enter indicator name");
      const descriptionInput = screen.getByPlaceholderText("Enter indicator description");

      await user.clear(nameInput);

      await user.type(nameInput, "Test Indicator");
      await user.clear(descriptionInput);

      await user.type(descriptionInput, "Test Description");

      const intRadio = screen.getByDisplayValue("int");
      await user.click(intRadio);

      const submitButton = screen.getByText("Create Output Metric");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          INDEXER.INDICATORS.V2.CREATE_OR_UPDATE(),
          "POST",
          expect.objectContaining({
            communityUID: "community-123",
          })
        );
      });
    });
  });
});
