import { render, screen } from "@testing-library/react";
import NotFoundPage from "@/app/not-found";
import "@testing-library/jest-dom";

describe("NotFoundPage", () => {
  it("renders the 404 message", () => {
    render(<NotFoundPage />);
    expect(screen.getByText("404 - Page Not Found")).toBeInTheDocument();
  });

  it("provides a way to navigate back to the home page", () => {
    render(<NotFoundPage />);
    const homeLink = screen.getByText("Go Home");
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.tagName).toBe("A");
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
