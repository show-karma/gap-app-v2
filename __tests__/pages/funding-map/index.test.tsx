import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import GrantProgramRegistry from "@/app/funding-map/page";
import { FundingMapWrapper } from "@/features/program-registry/components/FundingMapWrapper";

jest.mock("@/features/program-registry/components/FundingMapWrapper", () => ({
  FundingMapWrapper: jest.fn(() => <div data-testid="funding-map-wrapper" />),
}));

describe("GrantProgramRegistry Page", () => {
  it("renders the FundingMapWrapper component", () => {
    render(<GrantProgramRegistry />);

    expect(screen.getByTestId("funding-map-wrapper")).toBeInTheDocument();
  });

  it("calls the FundingMapWrapper component", () => {
    render(<GrantProgramRegistry />);

    expect(FundingMapWrapper).toHaveBeenCalled();
  });
});
