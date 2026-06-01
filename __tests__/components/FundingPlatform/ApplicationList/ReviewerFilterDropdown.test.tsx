import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewerFilterDropdown from "@/components/FundingPlatform/ApplicationList/ReviewerFilterDropdown";
import type { ProgramReviewer } from "@/services/program-reviewers.service";

const createMockReviewer = (overrides: Partial<ProgramReviewer> = {}): ProgramReviewer => ({
  publicAddress: "0xAAA111aaa111AAA111aaa111AAA111aaa111AAA1",
  name: "Alice Reviewer",
  email: "alice@example.com",
  assignedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("ReviewerFilterDropdown", () => {
  const noop = () => {};

  it("should_render_skeleton_when_loading", () => {
    const { container } = render(
      <ReviewerFilterDropdown reviewers={[]} selectedAddresses={[]} onChange={noop} isLoading />
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should_render_error_message_when_isError", () => {
    render(
      <ReviewerFilterDropdown reviewers={[]} selectedAddresses={[]} onChange={noop} isError />
    );

    expect(screen.getByText("Failed to load reviewers")).toBeInTheDocument();
  });

  it("should_render_empty_state_when_no_reviewers_have_address", () => {
    render(
      <ReviewerFilterDropdown
        reviewers={[createMockReviewer({ publicAddress: undefined })]}
        selectedAddresses={[]}
        onChange={noop}
      />
    );

    expect(screen.getByText("No reviewers to filter")).toBeInTheDocument();
  });

  it("should_show_all_reviewers_label_when_none_selected", () => {
    render(
      <ReviewerFilterDropdown
        reviewers={[createMockReviewer()]}
        selectedAddresses={[]}
        onChange={noop}
      />
    );

    expect(screen.getByText("All reviewers")).toBeInTheDocument();
  });

  it("should_show_single_reviewer_name_when_one_selected", () => {
    const reviewer = createMockReviewer();
    render(
      <ReviewerFilterDropdown
        reviewers={[reviewer]}
        selectedAddresses={[reviewer.publicAddress!.toLowerCase()]}
        onChange={noop}
      />
    );

    expect(screen.getByText("Alice Reviewer")).toBeInTheDocument();
  });

  it("should_show_count_label_when_multiple_selected", () => {
    const alice = createMockReviewer();
    const bob = createMockReviewer({
      publicAddress: "0xBBB222bbb222BBB222bbb222BBB222bbb222BBB2",
      name: "Bob Reviewer",
      email: "bob@example.com",
    });

    render(
      <ReviewerFilterDropdown
        reviewers={[alice, bob]}
        selectedAddresses={[alice.publicAddress!.toLowerCase(), bob.publicAddress!.toLowerCase()]}
        onChange={noop}
      />
    );

    expect(screen.getByText("2 reviewers selected")).toBeInTheDocument();
  });

  it("should_call_onChange_with_lowercased_address_when_option_selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const reviewer = createMockReviewer();

    render(
      <ReviewerFilterDropdown reviewers={[reviewer]} selectedAddresses={[]} onChange={onChange} />
    );

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Alice Reviewer"));

    expect(onChange).toHaveBeenCalledWith([reviewer.publicAddress!.toLowerCase()]);
  });
});
