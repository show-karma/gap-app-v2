import { render, screen } from "@testing-library/react";
import KarmaGapPatron from "@/app/karma-gap-patron/page";
import "@testing-library/jest-dom";

jest.mock("@/components/Pages/Project/AirdropGitcoinSupporters", () => ({
  GitcoinAirdropsManager: () => (
    <div data-testid="gitcoin-airdrops-manager">Gitcoin Airdrops Manager</div>
  ),
}));

jest.mock("@/components/Pages/Patron/RecentRounds", () => ({
  RecentRounds: () => <div data-testid="recent-rounds">Recent Rounds</div>,
  RecentRoundsMobile: () => (
    <div data-testid="recent-rounds-mobile">Recent Rounds Mobile</div>
  ),
}));

describe("KarmaGapPatron Page", () => {
  it("renders the GitcoinAirdropsManager component", () => {
    render(<KarmaGapPatron />);
    expect(screen.getByTestId("gitcoin-airdrops-manager")).toBeInTheDocument();
    expect(screen.getByText("Gitcoin Airdrops Manager")).toBeInTheDocument();
  });

  it("renders the RecentRounds components", () => {
    render(<KarmaGapPatron />);
    expect(screen.getByTestId("recent-rounds")).toBeInTheDocument();
    expect(screen.getByTestId("recent-rounds-mobile")).toBeInTheDocument();
  });
});
