import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewsFullView } from "@/components/Pages/Dashboard/v3/ReviewsFullView";
import type { FundingProgram } from "@/services/fundingPlatformService";
import type { Community } from "@/types/v2/community";

// The drill-in reuses the real reviewer inbox — stub it so we can assert which
// community it is rendered for without pulling the whole inbox/detail tree.
vi.mock("@/components/Inbox/ReviewerInboxPage", () => ({
  ReviewerInboxPage: ({ community }: { community: Community }) => (
    <div data-testid="reviewer-inbox">{community.details.name}</div>
  ),
}));

// PermissionProvider is a context wrapper — pass children straight through.
vi.mock("@/src/core/rbac/context/permission-context", () => ({
  PermissionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const program = (overrides: Partial<FundingProgram> = {}): FundingProgram =>
  ({
    programId: "prog-1",
    chainID: 10,
    name: "Wave 13",
    metadata: {} as FundingProgram["metadata"],
    applicationConfig: {} as FundingProgram["applicationConfig"],
    communitySlug: "filecoin",
    communityName: "Filecoin",
    communityUID: "0xfil",
    isProgramReviewer: true,
    ...overrides,
  }) as FundingProgram;

describe("ReviewsFullView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the reviewer inbox for the reviewer's community", async () => {
    render(<ReviewsFullView programs={[program()]} />);

    expect(await screen.findByTestId("reviewer-inbox")).toHaveTextContent("Filecoin");
    // A single community shows no switcher.
    expect(screen.queryByRole("button", { name: "Filecoin" })).not.toBeInTheDocument();
  });

  it("dedupes communities across programs and shows no switcher for one community", async () => {
    render(
      <ReviewsFullView programs={[program({ programId: "p1" }), program({ programId: "p2" })]} />
    );

    expect(await screen.findByTestId("reviewer-inbox")).toHaveTextContent("Filecoin");
    expect(screen.queryByRole("button", { name: "Filecoin" })).not.toBeInTheDocument();
  });

  it("shows a community switcher and swaps the active inbox on click", async () => {
    render(
      <ReviewsFullView
        programs={[
          program(),
          program({
            programId: "p2",
            communitySlug: "optimism",
            communityName: "Optimism",
            communityUID: "0xop",
          }),
        ]}
      />
    );

    // Defaults to the first community.
    expect(await screen.findByTestId("reviewer-inbox")).toHaveTextContent("Filecoin");

    // Both communities are offered as switcher pills.
    const optimismPill = screen.getByRole("button", { name: "Optimism" });
    fireEvent.click(optimismPill);

    expect(await screen.findByTestId("reviewer-inbox")).toHaveTextContent("Optimism");
    expect(optimismPill).toHaveAttribute("aria-pressed", "true");
  });

  it("renders an empty state when the reviewer has no programs", () => {
    render(<ReviewsFullView programs={[]} />);

    expect(screen.getByText("No reviews assigned yet")).toBeInTheDocument();
    expect(screen.queryByTestId("reviewer-inbox")).not.toBeInTheDocument();
  });
});
