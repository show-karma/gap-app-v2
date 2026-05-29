/**
 * Regression tests for the NewGrant `Milestone` form's VALIDATION-FAILURE paths.
 *
 * Production crashed with unhandled ZodError rejections because the form's
 * `zodResolver` re-threw validation errors instead of returning field errors
 * (Sentry GAP-FRONTEND-21Y: dates.endsAt "Date is required."; GAP-FRONTEND-21Z:
 * title "Title must be less than 50 characters"). The form had no
 * validation-failure test, so the regression slipped through.
 *
 * The title cases assert on the RENDERED error text: when the resolver throws
 * (the original bug) the error text never renders, so these assertions are
 * exactly what catches the regression. The end-date case (21Y) cannot surface
 * rendered text because that error <p> is bound to a second, never-submitted
 * `useForm` instance in the component; instead it drives the real resolver over
 * the `dates.endsAt` "Date is required." path and asserts no save + no enabled
 * submit. The real react-hook-form + @hookform/resolvers stack runs here —
 * neither is mocked. The global setup additionally fails any test that produces
 * an unhandled promise rejection, which is the surface the original bug
 * manifested on, so a throwing resolver fails every case in this file.
 */

import type { IMilestone } from "@show-karma/karma-gap-sdk";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Milestone } from "@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/Milestone";

// ---------------------------------------------------------------------------
// Store mock — controllable so the form renders in editing mode and we can
// assert on the `saveMilestone` side effect. We do NOT mock react-hook-form or
// the resolver; the real validation must run.
// ---------------------------------------------------------------------------
const mockSaveMilestone = vi.fn();
const mockRemoveMilestone = vi.fn();
const mockChangeMilestoneForm = vi.fn();
const mockSwitchMilestoneEditing = vi.fn();
const mockSetFormPriorities = vi.fn();

interface MockMilestoneForm {
  isValid: boolean;
  isEditing: boolean;
  data: IMilestone;
}

let mockMilestonesForms: MockMilestoneForm[] = [];

vi.mock("@/components/Pages/GrantMilestonesAndUpdates/screens/NewGrant/store", () => ({
  useGrantFormStore: () => ({
    removeMilestone: mockRemoveMilestone,
    saveMilestone: mockSaveMilestone,
    changeMilestoneForm: mockChangeMilestoneForm,
    switchMilestoneEditing: mockSwitchMilestoneEditing,
    milestonesForms: mockMilestonesForms,
    formPriorities: [],
    setFormPriorities: mockSetFormPriorities,
  }),
}));

// ---------------------------------------------------------------------------
// Heavy / unrelated UI dependencies. The DatePicker mock exposes a single
// button per field that fires `onSelect` with a fixed date, letting us drive
// the date fields without the real Radix/day-picker widget.
// ---------------------------------------------------------------------------
const FIXED_END_DATE = new Date("2024-12-31T00:00:00Z");
const FIXED_START_DATE = new Date("2024-01-01T00:00:00Z");

vi.mock("@/components/Utilities/DatePicker", () => ({
  DatePicker: ({
    onSelect,
    placeholder,
    selected,
  }: {
    onSelect: (date: Date) => void;
    placeholder?: string;
    selected?: Date;
  }) => {
    const label = placeholder ?? "date";
    // Each field passes a distinct minDate/placeholder; we distinguish by the
    // value the test wants by exposing two trigger buttons.
    return (
      <div data-testid="date-picker">
        <span data-testid="date-picker-value">{selected ? selected.toISOString() : ""}</span>
        <button type="button" onClick={() => onSelect(FIXED_END_DATE)}>
          {`pick-end ${label}`}
        </button>
        <button type="button" onClick={() => onSelect(FIXED_START_DATE)}>
          {`pick-start ${label}`}
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/Utilities/MarkdownEditor", () => ({
  MarkdownEditor: ({
    value,
    onChange,
    placeholderText,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholderText?: string;
  }) => (
    <textarea
      data-testid="markdown-editor"
      placeholder={placeholderText}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock("@/components/Utilities/MarkdownPreview", () => ({
  MarkdownPreview: ({ source }: { source?: string }) => (
    <div data-testid="markdown-preview">{source}</div>
  ),
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

const buildCurrentMilestone = (overrides: Partial<IMilestone> = {}): IMilestone =>
  ({
    title: "Initial milestone",
    description: "Initial description",
    endsAt: 1735603200,
    startsAt: 1704067200,
    priority: 1,
    ...overrides,
  }) as IMilestone;

const renderMilestone = () =>
  render(<Milestone currentMilestone={buildCurrentMilestone()} index={0} />);

beforeEach(() => {
  vi.clearAllMocks();
  mockMilestonesForms = [
    {
      isValid: false,
      isEditing: true,
      data: buildCurrentMilestone(),
    },
  ];
});

describe("NewGrant Milestone form — validation failures", () => {
  it("renders 'Title must be less than 50 characters' for a title longer than 50 chars (Sentry 21Z)", async () => {
    const user = userEvent.setup();
    renderMilestone();

    const titleInput = screen.getByPlaceholderText("Ex: Finalize requirements");
    await user.type(titleInput, "a".repeat(51));

    await waitFor(() => {
      expect(screen.getByText("Title must be less than 50 characters")).toBeInTheDocument();
    });

    expect(mockSaveMilestone).not.toHaveBeenCalled();
  });

  it("renders 'Title must be at least 3 characters' for a title shorter than 3 chars", async () => {
    const user = userEvent.setup();
    renderMilestone();

    const titleInput = screen.getByPlaceholderText("Ex: Finalize requirements");
    await user.type(titleInput, "ab");

    await waitFor(() => {
      expect(screen.getByText("Title must be at least 3 characters")).toBeInTheDocument();
    });

    expect(mockSaveMilestone).not.toHaveBeenCalled();
  });

  it("validates the required-end-date path without throwing and without saving (Sentry 21Y)", async () => {
    // The original bug surfaced as an *unhandled promise rejection* when the
    // resolver re-threw the `dates.endsAt` "Date is required." ZodError during
    // validation. The global test setup fails any test that produces an
    // unhandled rejection, so this test catches the regression two ways:
    //  1) the resolver runs (the form validates `onChange`) on a milestone with
    //     a valid title but NO end date — the exact 21Y schema path; and
    //  2) the missing end date must keep the form invalid, so the submit
    //     handler's save side effect never fires.
    const user = userEvent.setup();
    const { container } = renderMilestone();

    // Provide a valid title so the only failing field is the missing end date.
    const titleInput = screen.getByPlaceholderText("Ex: Finalize requirements");
    await user.type(titleInput, "A valid milestone title");

    // The submit button stays disabled while the form is invalid (no end date),
    // so submit the <form> directly to exercise `handleSubmit` -> resolver too.
    const formEl = container.querySelector("form");
    expect(formEl).not.toBeNull();
    if (formEl) {
      fireEvent.submit(formEl);
    }

    // Resolver must reject the missing end date by keeping the form invalid:
    // the Save button never enables and the save side effect never runs.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Milestone" })).toBeDisabled();
    });
    expect(mockSaveMilestone).not.toHaveBeenCalled();
  });

  it("does not trigger saveMilestone while any field is invalid", async () => {
    const user = userEvent.setup();
    renderMilestone();

    const titleInput = screen.getByPlaceholderText("Ex: Finalize requirements");
    await user.type(titleInput, "ab");

    await user.click(screen.getByRole("button", { name: "Save Milestone" }));

    await waitFor(() => {
      expect(screen.getByText("Title must be at least 3 characters")).toBeInTheDocument();
    });

    expect(mockSaveMilestone).not.toHaveBeenCalled();
  });
});
