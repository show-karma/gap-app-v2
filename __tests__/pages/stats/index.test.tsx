import { render, screen } from "@testing-library/react";
import Index from "@/app/stats/page";
import "@testing-library/jest-dom";

jest.mock("@/components/Pages/Stats", () => ({
  Stats: () => <div data-testid="stats-component">Stats Component</div>,
}));

describe("Stats Page", () => {
  it("renders the Stats component", () => {
    render(<Index />);
    expect(screen.getByTestId("stats-component")).toBeInTheDocument();
    expect(screen.getByText("Stats Component")).toBeInTheDocument();
  });
});
