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

jest.mock("@/src/components/footer/footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}));

jest.mock("@/src/components/navbar/navbar", () => ({
  Navbar: () => <header data-testid="header" />,
}));

jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

jest.mock("@/components/Utilities/PrivyProviderWrapper", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="privy-provider">{children}</div>
  ),
}));

jest.mock("@/components/Dialogs/StepperDialog", () => ({
  StepperDialog: () => <div data-testid="stepper-dialog" />,
}));

jest.mock("@/components/Dialogs/ContributorProfileDialog", () => ({
  ContributorProfileDialog: () => <div data-testid="contributor-profile-dialog" />,
}));

jest.mock("@/components/Dialogs/OnboardingDialog", () => ({
  OnboardingDialog: () => <div data-testid="onboarding-dialog" />,
}));

jest.mock("@/components/Utilities/PermissionsProvider", () => ({
  PermissionsProvider: () => <div data-testid="permissions-provider" />,
}));

jest.mock("@/components/ProgressBarWrapper", () => ({
  ProgressBarWrapper: () => <div data-testid="progress-bar-wrapper" />,
}));

jest.mock("@/components/Utilities/HotjarAnalytics", () => ({
  __esModule: true,
  default: () => <div data-testid="hotjar-analytics" />,
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
    expect(screen.getByTestId("contributor-profile-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("permissions-provider")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar-wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("privy-provider")).toBeInTheDocument();
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
