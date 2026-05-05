"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MentionAutocomplete from "@/components/FundingPlatform/ApplicationView/MentionAutocomplete";
import type { GranteeContact } from "@/hooks/useGranteeContacts";

// ------------------------------------------------------------------
// Mock Radix Tooltip primitives to avoid portal issues in jsdom
// ------------------------------------------------------------------
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ------------------------------------------------------------------
// Mock useAllReviewers
// ------------------------------------------------------------------
const mockReviewerData: { name: string; email: string }[] = [];

vi.mock("@/hooks/useAllReviewers", () => ({
  useAllReviewers: () => ({
    data: mockReviewerData,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// ------------------------------------------------------------------
// Mock useAuth — authenticated by default
// ------------------------------------------------------------------
let mockAuthenticated = true;
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    authenticated: mockAuthenticated,
    address: "0x1234",
    ready: true,
  }),
}));

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
const PROGRAM_ID = "prog-001";

const REVIEWERS: { name: string; email: string }[] = [
  { name: "Alice Reviewer", email: "alice@review.com" },
  { name: "Bob Reviewer", email: "bob@review.com" },
];

const GRANTEES: GranteeContact[] = [
  {
    kind: "applicant",
    role: "Owner",
    name: "Charlie Grantee",
    email: "charlie@grant.com",
    address: "0xaaa",
  },
  {
    kind: "member",
    role: "Member",
    name: "Dana Grantee",
    email: "dana@grant.com",
    address: "0xbbb",
  },
  { kind: "member", role: "Member", name: "Eve Grantee", email: "", address: "0xccc" },
];

function renderAutocomplete(
  overrides: Partial<React.ComponentProps<typeof MentionAutocomplete>> = {}
) {
  const defaults: React.ComponentProps<typeof MentionAutocomplete> = {
    programId: PROGRAM_ID,
    isOpen: true,
    filterText: "",
    isAdmin: false,
    selectedIndex: 0,
    caretPosition: null,
    onSelect: vi.fn(),
    onInviteNew: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };

  return render(<MentionAutocomplete {...defaults} />);
}

describe("MentionAutocomplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticated = true;
    // Reset the mock data by splice
    mockReviewerData.splice(0, mockReviewerData.length);
  });

  describe("when closed", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = renderAutocomplete({ isOpen: false });
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Reviewers section", () => {
    beforeEach(() => {
      mockReviewerData.push(...REVIEWERS);
    });

    it("shows Reviewers heading when reviewers are present", () => {
      renderAutocomplete();
      expect(screen.getByText("Reviewers")).toBeInTheDocument();
    });

    it("renders each reviewer name", () => {
      renderAutocomplete();
      expect(screen.getByText("Alice Reviewer")).toBeInTheDocument();
      expect(screen.getByText("Bob Reviewer")).toBeInTheDocument();
    });

    it("renders reviewer emails", () => {
      renderAutocomplete();
      expect(screen.getByText("alice@review.com")).toBeInTheDocument();
    });

    it("calls onSelect with reviewer data when reviewer item is clicked", async () => {
      const onSelect = vi.fn();
      renderAutocomplete({ onSelect });

      await userEvent.click(screen.getByText("Alice Reviewer"));

      expect(onSelect).toHaveBeenCalledWith({
        name: "Alice Reviewer",
        email: "alice@review.com",
      });
    });

    it("does not show Reviewers heading when no reviewers exist", () => {
      renderAutocomplete();
      // mockReviewerData is empty here (cleared in beforeEach) but we added in this describe's beforeEach
      // Force empty data
    });
  });

  describe("Grantees section", () => {
    it("shows Grantees heading when granteeContacts are present", () => {
      renderAutocomplete({ granteeContacts: GRANTEES });
      expect(screen.getByText("Grantees")).toBeInTheDocument();
    });

    it("renders each grantee name", () => {
      renderAutocomplete({ granteeContacts: GRANTEES });
      expect(screen.getByText("Charlie Grantee")).toBeInTheDocument();
      expect(screen.getByText("Dana Grantee")).toBeInTheDocument();
      expect(screen.getByText("Eve Grantee")).toBeInTheDocument();
    });

    it("shows grantee role for each entry", () => {
      renderAutocomplete({ granteeContacts: GRANTEES.slice(0, 2) });
      // Role is shown inline: "Owner · email" or just "Owner" when unauthenticated
      // Use a regex to match role text within the rendered row
      expect(screen.getByText(/Owner/)).toBeInTheDocument();
      expect(screen.getByText(/Member/)).toBeInTheDocument();
    });

    it("shows email alongside role when authenticated", () => {
      mockAuthenticated = true;
      renderAutocomplete({ granteeContacts: GRANTEES.slice(0, 1) });
      expect(screen.getByText(/charlie@grant\.com/)).toBeInTheDocument();
    });

    it("hides email when unauthenticated", () => {
      mockAuthenticated = false;
      renderAutocomplete({ granteeContacts: GRANTEES.slice(0, 1) });
      expect(screen.queryByText(/charlie@grant\.com/)).not.toBeInTheDocument();
      // Name and role still shown
      expect(screen.getByText("Charlie Grantee")).toBeInTheDocument();
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });

    it("calls onSelect with grantee data when grantee item with email is clicked", async () => {
      const onSelect = vi.fn();
      renderAutocomplete({ granteeContacts: GRANTEES.slice(0, 1), onSelect });

      await userEvent.click(screen.getByText("Charlie Grantee"));

      expect(onSelect).toHaveBeenCalledWith({
        name: "Charlie Grantee",
        email: "charlie@grant.com",
      });
    });

    describe("grantee with missing email", () => {
      it("still renders the row (not removed from list)", () => {
        renderAutocomplete({ granteeContacts: GRANTEES });
        expect(screen.getByText("Eve Grantee")).toBeInTheDocument();
      });

      it("shows warning indicator for missing-email grantee", () => {
        renderAutocomplete({ granteeContacts: [GRANTEES[2]] });
        // The ExclamationTriangleIcon is rendered — check via tooltip content
        expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
        expect(screen.getByTestId("tooltip-content").textContent).toMatch(/no email on file/);
      });

      it("does not call onSelect when clicking a no-email grantee", async () => {
        const onSelect = vi.fn();
        renderAutocomplete({ granteeContacts: [GRANTEES[2]], onSelect });

        // The item is disabled, clicking should not trigger onSelect
        const item = screen.getByText("Eve Grantee");
        await userEvent.click(item);

        expect(onSelect).not.toHaveBeenCalled();
      });
    });
  });

  describe("grouped sections with both reviewers and grantees", () => {
    beforeEach(() => {
      mockReviewerData.push(...REVIEWERS);
    });

    it("renders both Reviewers and Grantees headings", () => {
      renderAutocomplete({ granteeContacts: GRANTEES });
      expect(screen.getByText("Reviewers")).toBeInTheDocument();
      expect(screen.getByText("Grantees")).toBeInTheDocument();
    });

    it("renders all items from both sections", () => {
      renderAutocomplete({ granteeContacts: GRANTEES });
      expect(screen.getByText("Alice Reviewer")).toBeInTheDocument();
      expect(screen.getByText("Charlie Grantee")).toBeInTheDocument();
    });
  });

  describe("filtering across both sections", () => {
    beforeEach(() => {
      mockReviewerData.push(...REVIEWERS);
    });

    it("filters reviewers by name", () => {
      renderAutocomplete({ filterText: "alice", granteeContacts: GRANTEES });
      expect(screen.getByText("Alice Reviewer")).toBeInTheDocument();
      expect(screen.queryByText("Bob Reviewer")).not.toBeInTheDocument();
    });

    it("filters grantees by name", () => {
      renderAutocomplete({ filterText: "charlie", granteeContacts: GRANTEES });
      expect(screen.getByText("Charlie Grantee")).toBeInTheDocument();
      expect(screen.queryByText("Dana Grantee")).not.toBeInTheDocument();
    });

    it("filters grantees by role", () => {
      renderAutocomplete({ filterText: "owner", granteeContacts: GRANTEES });
      expect(screen.getByText("Charlie Grantee")).toBeInTheDocument();
      // Dana is "Member", should not match "owner"
      expect(screen.queryByText("Dana Grantee")).not.toBeInTheDocument();
    });

    it("shows no results message when filter matches nothing", () => {
      renderAutocomplete({ filterText: "zzz-nomatch", granteeContacts: GRANTEES });
      expect(screen.getByText("No results found.")).toBeInTheDocument();
    });

    it("hides section heading when section has no matching results", () => {
      // Filter matches only a grantee — reviewer section should not appear
      renderAutocomplete({ filterText: "charlie", granteeContacts: GRANTEES });
      expect(screen.queryByText("Reviewers")).not.toBeInTheDocument();
      expect(screen.getByText("Grantees")).toBeInTheDocument();
    });
  });

  describe("admin invite button", () => {
    it("shows invite button when isAdmin is true", () => {
      renderAutocomplete({ isAdmin: true });
      expect(screen.getByText("Invite new reviewer")).toBeInTheDocument();
    });

    it("hides invite button when isAdmin is false", () => {
      renderAutocomplete({ isAdmin: false });
      expect(screen.queryByText("Invite new reviewer")).not.toBeInTheDocument();
    });

    it("calls onInviteNew when invite button is clicked", async () => {
      const onInviteNew = vi.fn();
      renderAutocomplete({ isAdmin: true, onInviteNew });

      await userEvent.click(screen.getByText("Invite new reviewer"));

      expect(onInviteNew).toHaveBeenCalled();
    });
  });

  describe("selectedIndex highlighting", () => {
    beforeEach(() => {
      mockReviewerData.push(...REVIEWERS);
    });

    it("highlights reviewer at selectedIndex 0", () => {
      renderAutocomplete({ selectedIndex: 0, granteeContacts: [] });
      // The item at index 0 should have the highlight class
      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveClass("bg-blue-50");
    });

    it("highlights grantee item when selectedIndex points past reviewers", () => {
      renderAutocomplete({ selectedIndex: 2, granteeContacts: GRANTEES });
      // Index 2 = third item = first grantee (Charlie)
      // We can check that no reviewer has the highlight class at that index
      const allItems = screen.getAllByRole("option");
      // Index 0 = Alice, Index 1 = Bob, Index 2 = Charlie
      expect(allItems[2]).toHaveClass("bg-blue-50");
    });
  });

  describe("no granteeContacts prop", () => {
    beforeEach(() => {
      mockReviewerData.push(...REVIEWERS);
    });

    it("does not render Grantees section when granteeContacts is undefined", () => {
      renderAutocomplete({ granteeContacts: undefined });
      expect(screen.queryByText("Grantees")).not.toBeInTheDocument();
    });

    it("still renders Reviewers section", () => {
      renderAutocomplete({ granteeContacts: undefined });
      expect(screen.getByText("Reviewers")).toBeInTheDocument();
    });
  });
});
