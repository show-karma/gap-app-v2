import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Newsletter } from "@/src/components/footer/newsletter";

// Mock next-themes
const mockUseTheme = jest.fn();
jest.mock("next-themes", () => ({
  useTheme: () => mockUseTheme(),
}));

describe("Newsletter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({ resolvedTheme: "light" });
  });

  it("should render iframes with loading='lazy' attribute", () => {
    render(<Newsletter />);

    const iframes = screen.getAllByTitle(/Subscribe to KarmaHQ/);
    expect(iframes).toHaveLength(2);

    for (const iframe of iframes) {
      expect(iframe).toHaveAttribute("loading", "lazy");
    }
  });

  it("should pass theme=light to iframe src when app theme is light", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: "light" });
    render(<Newsletter />);

    const iframes = screen.getAllByTitle(/Subscribe to KarmaHQ/);
    for (const iframe of iframes) {
      expect(iframe).toHaveAttribute("src", expect.stringContaining("&theme=light"));
    }
  });

  it("should pass theme=dark to iframe src when app theme is dark", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: "dark" });
    render(<Newsletter />);

    const iframes = screen.getAllByTitle(/Subscribe to KarmaHQ/);
    for (const iframe of iframes) {
      expect(iframe).toHaveAttribute("src", expect.stringContaining("&theme=dark"));
    }
  });

  it("should default to light theme when resolvedTheme is undefined", () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: undefined });
    render(<Newsletter />);

    const iframes = screen.getAllByTitle(/Subscribe to KarmaHQ/);
    for (const iframe of iframes) {
      expect(iframe).toHaveAttribute("src", expect.stringContaining("&theme=light"));
    }
  });
});
