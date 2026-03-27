import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FundingMapSidebar } from "@/src/features/funding-map/components/funding-map-sidebar";

// Mock next-themes
const mockUseTheme = jest.fn();
jest.mock("next-themes", () => ({
  useTheme: () => mockUseTheme(),
}));

// Mock dependencies
jest.mock("@/hooks/useMixpanel", () => ({
  useMixpanel: () => ({
    mixpanel: { reportEvent: jest.fn() },
  }),
}));

jest.mock("next/dynamic", () => {
  return jest.fn(() => {
    const Component = () => <button type="button">Create a profile</button>;
    Component.displayName = "DynamicComponent";
    return Component;
  });
});

jest.mock("@/src/features/funding-map/components/funding-map-agent-card", () => ({
  FundingMapAgentCard: () => <div data-testid="agent-card" />,
}));

describe("FundingMapSidebar iframe theme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({ resolvedTheme: "light" });
  });

  it("should pass theme=light to iframe src when app theme is light", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: "light" });
    render(<FundingMapSidebar />);

    const iframe = screen.getByTitle("Subscribe to Karma");
    expect(iframe).toHaveAttribute("src", expect.stringContaining("&theme=light"));
  });

  it("should pass theme=dark to iframe src when app theme is dark", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: "dark" });
    render(<FundingMapSidebar />);

    const iframe = screen.getByTitle("Subscribe to Karma");
    expect(iframe).toHaveAttribute("src", expect.stringContaining("&theme=dark"));
  });

  it("should default to light theme when resolvedTheme is undefined", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: undefined });
    render(<FundingMapSidebar />);

    const iframe = screen.getByTitle("Subscribe to Karma");
    expect(iframe).toHaveAttribute("src", expect.stringContaining("&theme=light"));
  });
});
