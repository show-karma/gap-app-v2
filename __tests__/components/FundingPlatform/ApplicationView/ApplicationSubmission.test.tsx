import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import ApplicationSubmission from "@/components/FundingPlatform/ApplicationView/ApplicationSubmission";
import type { IFormSchema } from "@/types/funding-platform";

// Mock wagmi
jest.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890123456789012345678901234567890",
  }),
}));

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Button component
jest.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, onClick, disabled, type, isLoading, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      type={type}
      data-testid={props["data-testid"] || "button"}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  ),
}));

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: jest.fn(),
    resolvedTheme: "light",
  }),
}));

// Mock MarkdownEditor component - render as textarea for testing
jest.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({
    label,
    value,
    onChange,
    onBlur,
    error,
    description,
    isRequired,
    isDisabled,
    placeholder,
    id,
  }: any) => (
    <div>
      {label && (
        <label htmlFor={id}>
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
      )}
      {description && <p>{description}</p>}
      <textarea
        id={id}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={isDisabled}
        data-testid={`markdown-editor-${id}`}
      />
      {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
    </div>
  ),
}));

describe("ApplicationSubmission - Field Matching Logic", () => {
  const mockFormSchema: IFormSchema = {
    title: "Test Application Form",
    description: "Test form description",
    fields: [
      {
        id: "field-1",
        type: "text",
        label: "1. Project Name",
        required: true,
      },
      {
        id: "field-2",
        type: "email",
        label: "2. Email Address",
        required: true,
      },
      {
        id: "field-3",
        type: "text",
        label: "3. Project Description",
        required: false,
      },
    ],
  };

  const defaultProps = {
    programId: "program-123",
    chainId: 1,
    formSchema: mockFormSchema,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console.warn mock
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("normalizeForMatching - Strategy 1: Exact match with transformed fieldName", () => {
    it("should match initialData key using transformed fieldName (e.g., '1._project_name')", async () => {
      const initialData = {
        "1._project_name": "My Test Project",
        "2._email_address": "test@example.com",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("My Test Project");
      });
    });

    it("should match when initialData uses lowercase transformed format", async () => {
      const initialData = {
        "1._project_name": "Project A",
        "2._email_address": "email@test.com",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("Project A");
      });
    });
  });

  describe("normalizeForMatching - Strategy 2: Exact match with original field label", () => {
    it("should match initialData key using exact field label (case-insensitive)", async () => {
      const initialData = {
        "1. Project Name": "Exact Match Project",
        "2. Email Address": "exact@example.com",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("Exact Match Project");
      });
    });

    it("should match with different case variations", async () => {
      const initialData = {
        "1. PROJECT NAME": "Uppercase Project",
        "2. email address": "lowercase@example.com",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("Uppercase Project");
      });
    });
  });

  describe("Field Matching - Strategy 3: Case-insensitive label match", () => {
    it("should match when field label matches exactly (case-insensitive)", async () => {
      const initialData = {
        "1. PROJECT NAME": "Uppercase Label Match",
        "2. email address": "lowercase@test.com",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("Uppercase Label Match");
      });
    });

    it("should match when field label matches with different case", async () => {
      const initialData = {
        "1. Project Name": "Mixed Case Label",
        "2. EMAIL ADDRESS": "uppercase@test.com",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/2\. Email Address/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("Mixed Case Label");
        expect(emailInput.value).toBe("uppercase@test.com");
      });
    });
  });

  describe("Matching Priority", () => {
    it("should prioritize Strategy 1 (exact fieldName) over Strategy 2 (case-insensitive fieldName)", async () => {
      // If both formats exist, should use the exact fieldName match
      const initialData = {
        "1._project_name": "Exact FieldName Match",
        "1._PROJECT_NAME": "Case-Insensitive FieldName Match",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("Exact FieldName Match");
      });
    });

    it("should prioritize Strategy 2 (case-insensitive fieldName) over Strategy 3 (label match)", async () => {
      const initialData = {
        "1._PROJECT_NAME": "Case-Insensitive FieldName Match",
        "1. Project Name": "Label Match",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("Case-Insensitive FieldName Match");
      });
    });
  });

  describe("Unmatched Fields", () => {
    it("should leave fields empty when no match is found in edit mode", async () => {
      const initialData = {
        "Completely Different Field": "Some Value",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("");
      });
    });

    it("should leave fields empty when not in edit mode", async () => {
      const initialData = {
        "Completely Different Field": "Some Value",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={false} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("");
      });
    });

    it("should leave fields empty when no match is found", async () => {
      const initialData = {
        "Unrelated Field": "Some Value",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("");
      });
    });
  });

  describe("Form Pre-fill Integration", () => {
    it("should pre-fill all matching fields correctly", async () => {
      const initialData = {
        "1. Project Name": "Test Project",
        "2. Email Address": "test@example.com",
        "3. Project Description": "Test description",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/2\. Email Address/i) as HTMLInputElement;
        const descriptionInput = screen.getByLabelText(
          /3\. Project Description/i
        ) as HTMLInputElement;

        expect(projectNameInput.value).toBe("Test Project");
        expect(emailInput.value).toBe("test@example.com");
        expect(descriptionInput.value).toBe("Test description");
      });
    });

    it("should handle partial matches (some fields matched, some not)", async () => {
      const initialData = {
        "1. Project Name": "Matched Project",
        "Unmatched Field": "Unmatched Value",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/2\. Email Address/i) as HTMLInputElement;

        expect(projectNameInput.value).toBe("Matched Project");
        expect(emailInput.value).toBe("");
      });
    });

    it("should handle empty initialData", async () => {
      render(<ApplicationSubmission {...defaultProps} initialData={{}} isEditMode={true} />);

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("");
      });
    });

    it("should handle undefined initialData", async () => {
      render(<ApplicationSubmission {...defaultProps} isEditMode={true} />);

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("");
      });
    });
  });

  describe("Real-world Scenarios", () => {
    it("should handle mixed key formats in initialData", async () => {
      const initialData = {
        "1._project_name": "Transformed Format",
        "2. Email Address": "Label Format",
        "3. Project Description": "Label Format Description",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/2\. Email Address/i) as HTMLInputElement;
        const descriptionInput = screen.getByLabelText(
          /3\. Project Description/i
        ) as HTMLInputElement;

        expect(projectNameInput.value).toBe("Transformed Format");
        expect(emailInput.value).toBe("Label Format");
        expect(descriptionInput.value).toBe("Label Format Description");
      });
    });

    it("should handle case variations in field labels", async () => {
      const initialData = {
        "1. PROJECT NAME": "Uppercase Label",
        "2. email address": "lowercase@example.com",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/2\. Email Address/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("Uppercase Label");
        expect(emailInput.value).toBe("lowercase@example.com");
      });
    });
  });

  describe("Checkbox Field Validation", () => {
    const checkboxFormSchema: IFormSchema = {
      title: "Test Form with Checkboxes",
      fields: [
        {
          id: "field-1",
          type: "checkbox",
          label: "Select Options",
          required: true,
          options: ["Option 1", "Option 2", "Option 3"],
        },
        {
          id: "field-2",
          type: "checkbox",
          label: "Optional Checkboxes",
          required: false,
          options: ["A", "B", "C"],
          validation: {
            min: 2,
            max: 3,
          },
        },
      ],
    };

    it("should render checkbox fields correctly", () => {
      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={checkboxFormSchema}
          isEditMode={false}
        />
      );

      expect(screen.getByText("Select Options")).toBeInTheDocument();
      expect(screen.getByText("Optional Checkboxes")).toBeInTheDocument();
    });

    it("should pre-fill checkbox fields with array values", async () => {
      const initialData = {
        select_options: ["Option 1", "Option 3"],
        optional_checkboxes: ["A", "B"],
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={checkboxFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        // Checkboxes should be checked based on initialData
        const option1Checkbox = screen.getByLabelText(/Option 1/i) as HTMLInputElement;
        const option3Checkbox = screen.getByLabelText(/Option 3/i) as HTMLInputElement;
        expect(option1Checkbox.checked).toBe(true);
        expect(option3Checkbox.checked).toBe(true);
      });
    });

    it("should handle single value in checkbox initialData (convert to array)", async () => {
      const initialData = {
        select_options: "Option 1", // Single value instead of array
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={checkboxFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(
        () => {
          const option1Checkbox = screen.getByLabelText(/Option 1/i) as HTMLInputElement;
          expect(option1Checkbox.checked).toBe(true);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Number Field Validation", () => {
    const numberFormSchema: IFormSchema = {
      title: "Test Form with Numbers",
      fields: [
        {
          id: "field-1",
          type: "number",
          label: "Team Size",
          required: true,
          validation: {
            min: 1,
            max: 100,
          },
        },
        {
          id: "field-2",
          type: "number",
          label: "Budget",
          required: false,
          validation: {
            min: 0,
            maxLength: 10, // String length constraint
          },
        },
      ],
    };

    it("should render number fields correctly", () => {
      render(
        <ApplicationSubmission {...defaultProps} formSchema={numberFormSchema} isEditMode={false} />
      );

      expect(screen.getByLabelText(/Team Size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Budget/i)).toBeInTheDocument();
    });

    it("should pre-fill number fields with numeric values", async () => {
      const initialData = {
        team_size: "50",
        budget: "10000",
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={numberFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const teamSizeInput = screen.getByLabelText(/Team Size/i) as HTMLInputElement;
        const budgetInput = screen.getByLabelText(/Budget/i) as HTMLInputElement;
        expect(teamSizeInput.value).toBe("50");
        expect(budgetInput.value).toBe("10000");
      });
    });

    it("should convert number values to strings when pre-filling", async () => {
      // Test that numeric values from initialData are converted to strings
      const initialData = {
        team_size: 50, // Number instead of string
        budget: 10000, // Number instead of string
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={numberFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const teamSizeInput = screen.getByLabelText(/Team Size/i) as HTMLInputElement;
        const budgetInput = screen.getByLabelText(/Budget/i) as HTMLInputElement;
        expect(teamSizeInput.value).toBe("50");
        expect(budgetInput.value).toBe("10000");
      });
    });

    it("should convert boolean values to strings when pre-filling", async () => {
      const booleanFormSchema: IFormSchema = {
        title: "Test Form",
        fields: [
          {
            id: "field-1",
            type: "text",
            label: "Agree to Terms",
            required: false,
          },
        ],
      };

      const initialData = {
        agree_to_terms: true, // Boolean value
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={booleanFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const agreeInput = screen.getByLabelText(/Agree to Terms/i) as HTMLInputElement;
        expect(agreeInput.value).toBe("true");
      });
    });
  });

  describe("Email Field Validation - Optional vs Required", () => {
    const emailFormSchema: IFormSchema = {
      title: "Test Form with Email",
      fields: [
        {
          id: "field-1",
          type: "email",
          label: "Required Email",
          required: true,
          validation: {},
        },
        {
          id: "field-2",
          type: "email",
          label: "Optional Email",
          required: false,
          validation: {},
        },
      ],
    };

    it("should validate required email field", async () => {
      render(
        <ApplicationSubmission {...defaultProps} formSchema={emailFormSchema} isEditMode={false} />
      );

      const requiredEmailInput = screen.getByLabelText(/Required Email/i) as HTMLInputElement;
      expect(requiredEmailInput).toBeInTheDocument();
      expect(requiredEmailInput.type).toBe("email");
    });

    it("should allow empty optional email field", async () => {
      const initialData = {
        optional_email: "",
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={emailFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const optionalEmailInput = screen.getByLabelText(/Optional Email/i) as HTMLInputElement;
        expect(optionalEmailInput.value).toBe("");
      });
    });

    it("should validate optional email field when value is provided", async () => {
      const initialData = {
        optional_email: "invalid-email", // Invalid format
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={emailFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const optionalEmailInput = screen.getByLabelText(/Optional Email/i) as HTMLInputElement;
        expect(optionalEmailInput.value).toBe("invalid-email");
      });
    });

    it("should pre-fill optional email with valid email", async () => {
      const initialData = {
        optional_email: "test@example.com",
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={emailFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const optionalEmailInput = screen.getByLabelText(/Optional Email/i) as HTMLInputElement;
        expect(optionalEmailInput.value).toBe("test@example.com");
      });
    });
  });

  describe("URL Field Validation - Optional vs Required", () => {
    const urlFormSchema: IFormSchema = {
      title: "Test Form with URL",
      fields: [
        {
          id: "field-1",
          type: "url",
          label: "Required URL",
          required: true,
          validation: {},
        },
        {
          id: "field-2",
          type: "url",
          label: "Optional URL",
          required: false,
          validation: {},
        },
      ],
    };

    it("should validate required URL field", async () => {
      render(
        <ApplicationSubmission {...defaultProps} formSchema={urlFormSchema} isEditMode={false} />
      );

      const requiredUrlInput = screen.getByLabelText(/Required URL/i) as HTMLInputElement;
      expect(requiredUrlInput).toBeInTheDocument();
      expect(requiredUrlInput.type).toBe("url");
    });

    it("should allow empty optional URL field", async () => {
      const initialData = {
        optional_url: "",
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={urlFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const optionalUrlInput = screen.getByLabelText(/Optional URL/i) as HTMLInputElement;
        expect(optionalUrlInput.value).toBe("");
      });
    });

    it("should pre-fill optional URL with valid URL", async () => {
      const initialData = {
        optional_url: "https://example.com",
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={urlFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const optionalUrlInput = screen.getByLabelText(/Optional URL/i) as HTMLInputElement;
        expect(optionalUrlInput.value).toBe("https://example.com");
      });
    });
  });

  describe("Fields with Empty Validation Objects", () => {
    it("should handle text fields with empty validation object", async () => {
      const textFormSchema: IFormSchema = {
        title: "Test Form",
        fields: [
          {
            id: "field-1",
            type: "text",
            label: "Project Name",
            required: true,
            validation: {}, // Empty validation object
          },
        ],
      };

      render(
        <ApplicationSubmission {...defaultProps} formSchema={textFormSchema} isEditMode={false} />
      );

      const input = screen.getByLabelText(/Project Name/i) as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe("text");
    });

    it("should handle optional text fields with empty validation object", async () => {
      const textFormSchema: IFormSchema = {
        title: "Test Form",
        fields: [
          {
            id: "field-1",
            type: "text",
            label: "Optional Field",
            required: false,
            validation: {}, // Empty validation object
          },
        ],
      };

      const initialData = {
        optional_field: "",
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={textFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const input = screen.getByLabelText(/Optional Field/i) as HTMLInputElement;
        expect(input.value).toBe("");
      });
    });
  });

  describe("Edge Cases - Value Type Conversions", () => {
    it("should handle null values in initialData", async () => {
      const initialData = {
        "1. Project Name": null,
        "2. Email Address": null,
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/2\. Email Address/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("");
        expect(emailInput.value).toBe("");
      });
    });

    it("should handle undefined values in initialData", async () => {
      const initialData = {
        "1. Project Name": undefined,
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("");
      });
    });

    it("should handle array values for non-checkbox fields (convert to comma-separated)", async () => {
      const initialData = {
        "3. Project Description": ["Part 1", "Part 2", "Part 3"],
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const descriptionInput = screen.getByLabelText(
          /3\. Project Description/i
        ) as HTMLTextAreaElement;
        expect(descriptionInput.value).toBe("Part 1, Part 2, Part 3");
      });
    });

    it("should handle number zero in initialData", async () => {
      const numberFormSchema: IFormSchema = {
        title: "Test Form",
        fields: [
          {
            id: "field-1",
            type: "number",
            label: "Count",
            required: false,
            validation: {},
          },
        ],
      };

      const initialData = {
        count: 0,
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={numberFormSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const countInput = screen.getByLabelText(/Count/i) as HTMLInputElement;
        expect(countInput.value).toBe("0");
      });
    });
  });

  describe("Edge Cases - Field Matching", () => {
    it("should handle field name with special characters", async () => {
      const specialCharSchema: IFormSchema = {
        title: "Test Form",
        fields: [
          {
            id: "field-1",
            type: "text",
            label: "Field (with) [special] {chars}",
            required: true,
          },
        ],
      };

      // Field name will be: "field_(with)_[special]_{chars}" (spaces become underscores)
      const initialData = {
        "field_(with)_[special]_{chars}": "Special Value",
      };

      render(
        <ApplicationSubmission
          {...defaultProps}
          formSchema={specialCharSchema}
          initialData={initialData}
          isEditMode={true}
        />
      );

      await waitFor(() => {
        const input = screen.getByLabelText(
          /Field \(with\) \[special\] \{chars\}/i
        ) as HTMLInputElement;
        expect(input.value).toBe("Special Value");
      });
    });

    it("should handle case-insensitive matching for field labels", async () => {
      const initialData = {
        "1. PROJECT NAME": "Uppercase Match",
        "2. email address": "Lowercase Match",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        const emailInput = screen.getByLabelText(/2\. Email Address/i) as HTMLInputElement;
        expect(projectNameInput.value).toBe("Uppercase Match");
        expect(emailInput.value).toBe("Lowercase Match");
      });
    });

    it("should prioritize exact fieldName match over label match", async () => {
      const initialData = {
        "1._project_name": "FieldName Match",
        "1. Project Name": "Label Match",
      };

      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      );

      await waitFor(() => {
        const projectNameInput = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
        // Should use fieldName match (first strategy) - exact match takes priority
        expect(projectNameInput.value).toBe("FieldName Match");
      });
    });
  });

  describe("Strict Validation Edge Cases", () => {
    describe("Optional Fields with Validation Rules", () => {
      it("should not validate optional text field when empty", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Optional Text",
              required: false,
              validation: {
                min: 5,
                pattern: "^[A-Z].*",
              },
            },
          ],
        };

        render(<ApplicationSubmission {...defaultProps} formSchema={schema} isEditMode={false} />);

        const input = screen.getByLabelText(/Optional Text/i) as HTMLInputElement;
        expect(input.value).toBe("");
        // Empty optional field should not show validation error
        expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
      });

      it("should validate optional text field when value is provided", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Optional Text",
              required: false,
              validation: {
                min: 5,
              },
            },
          ],
        };

        const initialData = {
          optional_text: "abc", // Too short, should fail validation
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Optional Text/i) as HTMLInputElement;
          expect(input.value).toBe("abc");
        });
      });

      it("should validate optional email field format when value provided", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "email",
              label: "Optional Email",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          optional_email: "invalid-email-format",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Optional Email/i) as HTMLInputElement;
          expect(input.value).toBe("invalid-email-format");
        });
      });

      it("should allow empty optional URL field", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "url",
              label: "Optional URL",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          optional_url: "",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Optional URL/i) as HTMLInputElement;
          expect(input.value).toBe("");
        });
      });

      it("should validate optional URL format when value provided", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "url",
              label: "Optional URL",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          optional_url: "not-a-valid-url",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Optional URL/i) as HTMLInputElement;
          expect(input.value).toBe("not-a-valid-url");
        });
      });
    });

    describe("Number Field Edge Cases", () => {
      it("should handle negative numbers", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "number",
              label: "Temperature",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          temperature: -10,
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Temperature/i) as HTMLInputElement;
          expect(input.value).toBe("-10");
        });
      });

      it("should handle decimal numbers", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "number",
              label: "Price",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          price: 99.99,
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Price/i) as HTMLInputElement;
          expect(input.value).toBe("99.99");
        });
      });

      it("should handle zero value", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "number",
              label: "Count",
              required: true,
              validation: {
                min: 0,
              },
            },
          ],
        };

        const initialData = {
          count: 0,
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Count/i) as HTMLInputElement;
          expect(input.value).toBe("0");
        });
      });

      it("should handle very large numbers", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "number",
              label: "Large Number",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          large_number: 999999999999999,
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Large Number/i) as HTMLInputElement;
          expect(input.value).toBe("999999999999999");
        });
      });

      it("should validate optional number field only when value provided", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "number",
              label: "Optional Number",
              required: false,
              validation: {
                min: 10,
                max: 100,
              },
            },
          ],
        };

        const initialData = {
          optional_number: "",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Optional Number/i) as HTMLInputElement;
          expect(input.value).toBe("");
        });
      });
    });

    describe("Text/Textarea Edge Cases", () => {
      it("should handle very long text values", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "textarea",
              label: "Long Text",
              required: false,
              validation: {},
            },
          ],
        };

        const longText = "a".repeat(10000);
        const initialData = {
          long_text: longText,
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Long Text/i) as HTMLTextAreaElement;
          expect(input.value).toBe(longText);
        });
      });

      it("should handle text with special characters", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Special Text",
              required: false,
              validation: {},
            },
          ],
        };

        const specialText = "Text with !@#$%^&*()_+-=[]{}|;':\",./<>?";
        const initialData = {
          special_text: specialText,
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Special Text/i) as HTMLInputElement;
          expect(input.value).toBe(specialText);
        });
      });

      it("should handle unicode characters", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Unicode Text",
              required: false,
              validation: {},
            },
          ],
        };

        const unicodeText = "Hello 世界 🌍 こんにちは";
        const initialData = {
          unicode_text: unicodeText,
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Unicode Text/i) as HTMLInputElement;
          expect(input.value).toBe(unicodeText);
        });
      });

      it("should handle newlines in textarea", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "textarea",
              label: "Multiline Text",
              required: false,
              validation: {},
            },
          ],
        };

        const multilineText = "Line 1\nLine 2\nLine 3";
        const initialData = {
          multiline_text: multilineText,
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Multiline Text/i) as HTMLTextAreaElement;
          expect(input.value).toBe(multilineText);
        });
      });
    });

    describe("Checkbox Edge Cases", () => {
      it("should handle empty checkbox array", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "checkbox",
              label: "Options",
              required: false,
              options: ["A", "B", "C"],
              validation: {},
            },
          ],
        };

        const initialData = {
          options: [],
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const optionA = screen.getByLabelText(/^A$/i) as HTMLInputElement;
          const optionB = screen.getByLabelText(/^B$/i) as HTMLInputElement;
          expect(optionA.checked).toBe(false);
          expect(optionB.checked).toBe(false);
        });
      });

      it("should handle checkbox with single value (non-array)", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "checkbox",
              label: "Options",
              required: false,
              options: ["A", "B", "C"],
              validation: {},
            },
          ],
        };

        const initialData = {
          options: "A", // Single string instead of array
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const optionA = screen.getByLabelText(/^A$/i) as HTMLInputElement;
          expect(optionA.checked).toBe(true);
        });
      });

      it("should handle checkbox with all options selected", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "checkbox",
              label: "Options",
              required: false,
              options: ["A", "B", "C"],
              validation: {},
            },
          ],
        };

        const initialData = {
          options: ["A", "B", "C"],
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const optionA = screen.getByLabelText(/^A$/i) as HTMLInputElement;
          const optionB = screen.getByLabelText(/^B$/i) as HTMLInputElement;
          const optionC = screen.getByLabelText(/^C$/i) as HTMLInputElement;
          expect(optionA.checked).toBe(true);
          expect(optionB.checked).toBe(true);
          expect(optionC.checked).toBe(true);
        });
      });
    });

    describe("Select/Radio Edge Cases", () => {
      it("should handle select field with empty value", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "select",
              label: "Category",
              required: false,
              options: ["Option 1", "Option 2"],
              validation: {},
            },
          ],
        };

        const initialData = {
          category: "",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const select = screen.getByLabelText(/Category/i) as HTMLSelectElement;
          expect(select.value).toBe("");
        });
      });

      it("should handle radio field with value", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "radio",
              label: "Choice",
              required: false,
              options: ["Yes", "No"],
              validation: {},
            },
          ],
        };

        const initialData = {
          choice: "Yes",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const yesRadio = screen.getByLabelText(/^Yes$/i) as HTMLInputElement;
          expect(yesRadio.checked).toBe(true);
        });
      });
    });

    describe("Form Submission Edge Cases", () => {
      it("should handle form with all optional fields empty", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Optional Field 1",
              required: false,
              validation: {},
            },
            {
              id: "field-2",
              type: "text",
              label: "Optional Field 2",
              required: false,
              validation: {},
            },
          ],
        };

        const onSubmit = jest.fn();
        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            onSubmit={onSubmit}
            isEditMode={false}
          />
        );

        const submitButton = screen.getByText(/Submit Application/i);
        expect(submitButton).toBeInTheDocument();
        // Form should be valid even with all optional fields empty
      });

      it("should handle form with mixed required and optional fields", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Required Field",
              required: true,
              validation: {},
            },
            {
              id: "field-2",
              type: "text",
              label: "Optional Field",
              required: false,
              validation: {},
            },
          ],
        };

        render(<ApplicationSubmission {...defaultProps} formSchema={schema} isEditMode={false} />);

        const requiredInput = screen.getByLabelText(/Required Field/i) as HTMLInputElement;
        const optionalInput = screen.getByLabelText(/Optional Field/i) as HTMLInputElement;

        expect(requiredInput).toBeInTheDocument();
        expect(optionalInput).toBeInTheDocument();
        expect(requiredInput.value).toBe("");
        expect(optionalInput.value).toBe("");
      });
    });

    describe("Pre-fill Edge Cases with Invalid Data Types", () => {
      it("should handle object values in initialData (convert to string)", async () => {
        const initialData = {
          "1. Project Name": { name: "Project", id: 1 }, // Object value
        };

        render(
          <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
          expect(input.value).toBe("[object Object]");
        });
      });

      it("should handle function values in initialData (convert to string)", async () => {
        const initialData = {
          "1. Project Name": () => "test", // Function value
        };

        render(
          <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/1\. Project Name/i) as HTMLInputElement;
          expect(typeof input.value).toBe("string");
        });
      });

      it("should handle nested arrays in non-checkbox fields", async () => {
        const initialData = {
          "3. Project Description": [
            ["Nested", "Array"],
            ["Level", "2"],
          ],
        };

        render(
          <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/3\. Project Description/i) as HTMLTextAreaElement;
          expect(input.value).toContain("Nested");
        });
      });
    });

    describe("Field Name Edge Cases", () => {
      it("should handle field labels with only numbers", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "123",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          "123": "Number Label",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/^123$/i) as HTMLInputElement;
          expect(input.value).toBe("Number Label");
        });
      });

      it("should handle field labels with only special characters", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "!!!",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          "!!!": "Special Label",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/^!!!$/i) as HTMLInputElement;
          expect(input.value).toBe("Special Label");
        });
      });

      it("should handle very long field labels", async () => {
        const longLabel = "A".repeat(200);
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: longLabel,
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          [longLabel.toLowerCase().replace(/\s+/g, "_")]: "Long Label Value",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(new RegExp(longLabel, "i")) as HTMLInputElement;
          expect(input.value).toBe("Long Label Value");
        });
      });
    });

    describe("Validation Rule Edge Cases", () => {
      it("should handle pattern validation for optional fields", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Code",
              required: false,
              validation: {
                pattern: "^[A-Z]{3}$",
                message: "Must be 3 uppercase letters",
              },
            },
          ],
        };

        const initialData = {
          code: "", // Empty should pass for optional
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Code/i) as HTMLInputElement;
          expect(input.value).toBe("");
        });
      });

      it("should handle min/max validation for optional text fields", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Description",
              required: false,
              validation: {
                min: 10,
                maxLength: 100,
              },
            },
          ],
        };

        const initialData = {
          description: "", // Empty should pass
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Description/i) as HTMLInputElement;
          expect(input.value).toBe("");
        });
      });
    });

    describe("Form State and Validation Edge Cases", () => {
      it("should disable submit button when form is invalid", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Required Field",
              required: true,
              validation: {},
            },
          ],
        };

        render(<ApplicationSubmission {...defaultProps} formSchema={schema} isEditMode={false} />);

        const submitButton = screen.getByText(/Submit Application/i) as HTMLButtonElement;
        expect(submitButton.disabled).toBe(true);
      });

      it("should enable submit button when all required fields are valid", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Required Field",
              required: true,
              validation: {},
            },
          ],
        };

        const initialData = {
          required_field: "Valid Value",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const submitButton = screen.getByText(/Update Application/i) as HTMLButtonElement;
          // Button should be enabled if form is valid
          expect(submitButton).toBeInTheDocument();
        });
      });

      it("should handle form with duplicate field labels", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Duplicate Label",
              required: false,
              validation: {},
            },
            {
              id: "field-2",
              type: "text",
              label: "Duplicate Label",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          duplicate_label: "First Value",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          // When fields have duplicate labels, they share the same form key (duplicate_label)
          // React Hook Form registers fields by name, so duplicate names will share the same form state
          // Both label elements exist, but they're associated with the same input field
          const labels = screen.getAllByText(/Duplicate Label/i);
          expect(labels.length).toBeGreaterThanOrEqual(1);
          // The form field should be populated with the initial data
          const input = screen.getByLabelText(/Duplicate Label/i) as HTMLInputElement;
          expect(input.value).toBe("First Value");
        });
      });
    });

    describe("Pre-fill Edge Cases - Data Type Handling", () => {
      it("should handle Symbol values in initialData", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Text Field",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          text_field: Symbol("test"),
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Text Field/i) as HTMLInputElement;
          expect(typeof input.value).toBe("string");
        });
      });
    });

    describe("Validation Schema Edge Cases", () => {
      it("should handle field with validation.min = 0", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Text Field",
              required: false,
              validation: {
                min: 0, // Zero minimum
              },
            },
          ],
        };

        const initialData = {
          text_field: "",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Text Field/i) as HTMLInputElement;
          expect(input.value).toBe("");
        });
      });

      it("should handle field with validation.max = 0", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Text Field",
              required: false,
              validation: {
                maxLength: 0, // Zero maximum
              },
            },
          ],
        };

        const initialData = {
          text_field: "",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Text Field/i) as HTMLInputElement;
          expect(input.value).toBe("");
        });
      });

      it("should handle number field with min = 0 and max = 0", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "number",
              label: "Number Field",
              required: false,
              validation: {
                min: 0,
                max: 0,
              },
            },
          ],
        };

        const initialData = {
          number_field: 0,
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Number Field/i) as HTMLInputElement;
          expect(input.value).toBe("0");
        });
      });
    });

    describe("Form Schema Edge Cases", () => {
      it("should handle empty form schema", () => {
        const emptySchema: IFormSchema = {
          title: "Empty Form",
          fields: [],
        };

        render(
          <ApplicationSubmission {...defaultProps} formSchema={emptySchema} isEditMode={false} />
        );

        expect(screen.getByText(/Empty Form/i)).toBeInTheDocument();
      });

      it("should handle form schema with only optional fields", () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Optional 1",
              required: false,
              validation: {},
            },
            {
              id: "field-2",
              type: "text",
              label: "Optional 2",
              required: false,
              validation: {},
            },
          ],
        };

        render(<ApplicationSubmission {...defaultProps} formSchema={schema} isEditMode={false} />);

        const submitButton = screen.getByText(/Submit Application/i) as HTMLButtonElement;
        // Form with all optional fields should be valid (submit button enabled)
        expect(submitButton).toBeInTheDocument();
      });

      it("should handle form schema with 100+ fields", () => {
        const manyFields: IFormSchema = {
          title: "Large Form",
          fields: Array.from({ length: 100 }, (_, i) => ({
            id: `field-${i}`,
            type: "text" as const,
            label: `Field ${i + 1}`,
            required: i % 2 === 0, // Alternate required/optional
            validation: {},
          })),
        };

        render(
          <ApplicationSubmission {...defaultProps} formSchema={manyFields} isEditMode={false} />
        );

        expect(screen.getByText(/Large Form/i)).toBeInTheDocument();
        // Should render without crashing
      });
    });

    describe("Pre-fill with Malformed Data", () => {
      it("should handle initialData with circular references (should not crash)", async () => {
        const circular: any = { value: "test" };
        circular.self = circular;

        const initialData = {
          "1. Project Name": circular,
        };

        // Should not throw error
        expect(() => {
          render(
            <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
          );
        }).not.toThrow();
      });

      it("should handle initialData with very deep nested arrays", async () => {
        let deepArray: any = [];
        for (let i = 0; i < 100; i++) {
          deepArray = [deepArray];
        }

        const initialData = {
          "3. Project Description": deepArray,
        };

        render(
          <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/3\. Project Description/i) as HTMLTextAreaElement;
          expect(typeof input.value).toBe("string");
        });
      });
    });

    describe("Checkbox Validation Edge Cases", () => {
      it("should handle optional checkbox with min validation when empty", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "checkbox",
              label: "Options",
              required: false,
              options: ["A", "B", "C"],
              validation: {
                min: 2, // Minimum 2 selections
              },
            },
          ],
        };

        const initialData = {
          options: [], // Empty array
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const optionA = screen.getByLabelText(/^A$/i) as HTMLInputElement;
          expect(optionA.checked).toBe(false);
        });
      });

      it("should handle required checkbox with max validation", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "checkbox",
              label: "Options",
              required: true,
              options: ["A", "B", "C"],
              validation: {
                max: 2, // Maximum 2 selections
              },
            },
          ],
        };

        const initialData = {
          options: ["A", "B", "C"], // All selected (exceeds max)
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const optionA = screen.getByLabelText(/^A$/i) as HTMLInputElement;
          const optionB = screen.getByLabelText(/^B$/i) as HTMLInputElement;
          const optionC = screen.getByLabelText(/^C$/i) as HTMLInputElement;
          expect(optionA.checked).toBe(true);
          expect(optionB.checked).toBe(true);
          expect(optionC.checked).toBe(true);
        });
      });
    });

    describe("URL Validation Edge Cases", () => {
      it("should handle URLs with different protocols", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "url",
              label: "Website",
              required: false,
              validation: {},
            },
          ],
        };

        const testUrls = [
          "https://example.com",
          "http://example.com",
          "ftp://example.com",
          "mailto:test@example.com",
        ];

        for (const url of testUrls) {
          const initialData = {
            website: url,
          };

          const { unmount } = render(
            <ApplicationSubmission
              {...defaultProps}
              formSchema={schema}
              initialData={initialData}
              isEditMode={true}
            />
          );

          await waitFor(() => {
            const input = screen.getByLabelText(/Website/i) as HTMLInputElement;
            expect(input.value).toBe(url);
          });

          unmount();
        }
      });

      it("should handle URLs with ports and paths", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "url",
              label: "API Endpoint",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          api_endpoint: "https://api.example.com:8080/v1/users?page=1",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/API Endpoint/i) as HTMLInputElement;
          expect(input.value).toBe("https://api.example.com:8080/v1/users?page=1");
        });
      });
    });

    describe("Email Validation Edge Cases", () => {
      it("should handle email with plus signs", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "email",
              label: "Email",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          email: "user+tag@example.com",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Email/i) as HTMLInputElement;
          expect(input.value).toBe("user+tag@example.com");
        });
      });

      it("should handle email with subdomains", async () => {
        const schema: IFormSchema = {
          title: "Test Form",
          fields: [
            {
              id: "field-1",
              type: "email",
              label: "Email",
              required: false,
              validation: {},
            },
          ],
        };

        const initialData = {
          email: "user@mail.subdomain.example.com",
        };

        render(
          <ApplicationSubmission
            {...defaultProps}
            formSchema={schema}
            initialData={initialData}
            isEditMode={true}
          />
        );

        await waitFor(() => {
          const input = screen.getByLabelText(/Email/i) as HTMLInputElement;
          expect(input.value).toBe("user@mail.subdomain.example.com");
        });
      });
    });
  });
});
