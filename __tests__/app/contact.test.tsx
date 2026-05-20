import { render, screen } from "@testing-library/react";
import ContactPage, { metadata } from "@/app/contact/page";

describe("app/contact/page.tsx", () => {
  it("renders the Contact Karma H1", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { level: 1, name: /contact karma/i })).toBeInTheDocument();
  });

  it("includes substantive body content (>500 chars)", () => {
    const { container } = render(<ContactPage />);
    expect(container.textContent?.length ?? 0).toBeGreaterThan(500);
  });

  it("declares the canonical /contact path in metadata", () => {
    const canonical = (metadata.alternates?.canonical ?? "") as string;
    expect(canonical).toBe("/contact");
  });

  it("exposes the info@karmahq.xyz contact mailto link", () => {
    render(<ContactPage />);
    const mailtoLink = screen.getByRole("link", { name: /info@karmahq\.xyz/i });
    expect(mailtoLink.getAttribute("href")).toBe("mailto:info@karmahq.xyz");
  });
});
