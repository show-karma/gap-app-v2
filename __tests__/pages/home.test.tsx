import { render, screen } from "@testing-library/react";
import Index from "@/app/page";
import "@testing-library/jest-dom";

jest.mock("@/components/Pages/Home/NewFeatureBanner", () => ({
  NewFeatureBanner: () => <div data-testid="new-feature-banner" />,
}));

jest.mock("@/components/Pages/Home/Presentation", () => ({
  Presentation: () => <div data-testid="presentation" />,
}));

jest.mock("@/components/Pages/Home/Communities", () => ({
  Communities: () => <div data-testid="communities" />,
}));

jest.mock("@/components/Pages/Home/WhatIsSolving", () => ({
  WhatIsSolving: () => <div data-testid="what-is-solving" />,
}));

describe("Homepage", () => {
  it("renders all components correctly", () => {
    render(<Index />);

    expect(screen.getByTestId("new-feature-banner")).toBeInTheDocument();
    expect(screen.getByTestId("presentation")).toBeInTheDocument();
    expect(screen.getByTestId("communities")).toBeInTheDocument();
    expect(screen.getByTestId("what-is-solving")).toBeInTheDocument();
  });

  it("has the correct structure", () => {
    render(<Index />);

    const mainContainer = screen.getByRole("main");
    expect(mainContainer).toHaveClass(
      "flex w-full flex-col items-center bg-white dark:bg-black"
    );

    const innerContainer = mainContainer.firstChild;
    expect(innerContainer).toHaveClass(
      "flex w-full max-w-[1920px] flex-col gap-2 px-16 py-1 pt-4 max-lg:px-8 max-md:px-4"
    );

    const componentsContainer = innerContainer?.childNodes[1];
    expect(componentsContainer).toHaveClass("flex flex-col gap-16 py-4");
  });
});
