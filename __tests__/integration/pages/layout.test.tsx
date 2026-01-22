import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";
import "@testing-library/jest-dom";

// All mocks are pre-registered in tests/bun-setup.ts:
// - @vercel/speed-insights/next
// - @vercel/analytics/react
// - @next/third-parties/google
// - @/src/components/footer/footer
// - @/src/components/navbar/navbar
// - react-hot-toast
// - @/components/Utilities/PrivyProviderWrapper
// - @/components/Dialogs/ContributorProfileDialog
// - @/components/Dialogs/OnboardingDialog
// - @/components/Utilities/PermissionsProvider
// - @/components/ProgressBarWrapper
// - @/components/Utilities/HotjarAnalytics
// - next-themes

describe("RootLayout", () => {
  it("renders all components correctly", () => {
    render(<RootLayout>Test Content</RootLayout>);

    expect(screen.getByTestId("speed-insights")).toBeInTheDocument();
    expect(screen.getByTestId("analytics")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
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
