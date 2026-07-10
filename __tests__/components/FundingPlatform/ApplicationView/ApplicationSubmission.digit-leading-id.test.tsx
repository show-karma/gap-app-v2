/**
 * @file Integration regression coverage for PR #1451.
 *
 * Opening the Edit Application modal threw `SyntaxError` whenever a textarea
 * field's label started with a digit (e.g. `"21. Project Summary"`):
 *   `toFieldName("21. Project Summary")` → `"21_project_summary"`, which
 *   `MarkdownEditor` passed straight to `md-editor-rt`, whose internal
 *   `document.querySelector('#${id} .cm-scroller')` rejected the digit-leading
 *   selector and tore down the modal. The fix lives in `MarkdownEditor`
 *   (covered by unit tests in `__tests__/components/Utilities/`); this file
 *   pins the wiring at the `ApplicationSubmission` boundary so a future
 *   refactor can't reintroduce the bug via a different path.
 *
 * These tests live in their own file (rather than appending to the very large
 * `ApplicationSubmission.test.tsx`) to avoid tripping the oversized-file
 * quality gate.
 */
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import ApplicationSubmission from "@/components/FundingPlatform/ApplicationView/ApplicationSubmission";
import type { IFormSchema } from "@/types/funding-platform";

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890123456789012345678901234567890",
  }),
}));

vi.mock("@/components/EthereumAddressToProfileName", () => ({
  default: ({ address }: { address?: string }) => <span>{address}</span>,
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/Utilities/Button", () => ({
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

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
}));

// Mock MarkdownEditor — echo the `id` prop into a data-testid so we can
// assert ApplicationSubmission is wiring it correctly. The fix itself is
// covered by the real MarkdownEditor's unit tests.
vi.mock("@/components/Utilities/MarkdownEditor", () => ({
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

describe("ApplicationSubmission — digit-leading textarea label (PR #1451 regression)", () => {
  const digitLabelSchema: IFormSchema = {
    title: "Test Form",
    fields: [
      {
        id: "field-1",
        type: "textarea",
        label: "21. Project Summary",
        required: false,
        validation: {},
      },
    ],
  };

  const defaultProps = {
    programId: "program-123",
    chainId: 1,
    formSchema: digitLabelSchema,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render edit modal without throwing for digit-leading textarea label", () => {
    const initialData = { "21_project_summary": "Existing answer" };

    expect(() =>
      render(
        <ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />
      )
    ).not.toThrow();
  });

  it("should pre-fill the digit-leading textarea from transformed-key initialData", async () => {
    const initialData = { "21_project_summary": "Existing answer" };

    render(<ApplicationSubmission {...defaultProps} initialData={initialData} isEditMode={true} />);

    await waitFor(() => {
      const input = screen.getByLabelText(/21\. Project Summary/i) as HTMLTextAreaElement;
      expect(input.value).toBe("Existing answer");
    });
  });

  it("should pass the digit-leading id through to MarkdownEditor without mutating it", async () => {
    // ApplicationSubmission must keep passing the raw transformed fieldName so
    // MarkdownEditor receives it and can apply its safe-id guard. If
    // ApplicationSubmission ever starts stripping the digit itself, the unit
    // tests on MarkdownEditor would still pass but the wiring would be broken.
    render(<ApplicationSubmission {...defaultProps} isEditMode={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("markdown-editor-21_project_summary")).toBeInTheDocument();
    });
  });
});
