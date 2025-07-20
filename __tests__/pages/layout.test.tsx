import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";
import "@testing-library/jest-dom";

jest.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: () => <div data-testid="speed-insights" />,
}));

jest.mock("@vercel/analytics/react", () => ({
  Analytics: () => <div data-testid="analytics" />,
}));

jest.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: () => <div data-testid="google-analytics" />,
}));

jest.mock("@/components/ui/Footer", () => ({
  __esModule: true,
  default: () => <footer data-testid="footer" />,
}));

jest.mock("@/components/ui/Header", () => ({
  __esModule: true,
  default: () => <header data-testid="header" />,
}));

jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

jest.mock("@/components/ui/WagmiProvider", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wagmi-provider">{children}</div>
  ),
}));

jest.mock("@/components/Dialogs/StepperDialog", () => ({
  StepperDialog: () => <div data-testid="stepper-dialog" />,
}));

jest.mock("@/components/ProgressBarWrapper", () => ({
  ProgressBarWrapper: () => <div data-testid="progress-bar-wrapper" />,
}));

jest.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

describe("RootLayout", () => {
  it("renders all components correctly", () => {
    render(<RootLayout>Test Content</RootLayout>);

    expect(screen.getByTestId("speed-insights")).toBeInTheDocument();
    expect(screen.getByTestId("analytics")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByTestId("stepper-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar-wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("wagmi-provider")).toBeInTheDocument();
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(<RootLayout>Test Content</RootLayout>);
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("has the correct HTML structure", () => {
    render(<RootLayout>Test Content</RootLayout>);

    const body = screen.getByText("Test Content").closest("body");
    expect(body).toBeInTheDocument();

    // it should check if it rendered <Header/>
    expect(screen.getByTestId("header")).toBeInTheDocument();
    // it should check if it rendered <Footer/>
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });
});
