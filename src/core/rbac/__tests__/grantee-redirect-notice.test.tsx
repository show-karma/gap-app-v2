import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GranteeRedirectNotice } from "../components/grantee-redirect-notice";

// The shared Link wrapper pulls in whitelabel + url-builder context; stub it to a
// plain anchor so this stays a focused presentational test.
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("GranteeRedirectNotice", () => {
  it("renders the applicant message and a single-application CTA", () => {
    render(
      <GranteeRedirectNotice
        redirectUrl="/community/optimism/applications/REF-1"
        applicationCount={1}
      />
    );

    expect(screen.getByText("Looking for your application?")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /view your application/i });
    expect(link).toHaveAttribute("href", "/community/optimism/applications/REF-1");
  });

  it("points multiple-application users at the dashboard", () => {
    render(<GranteeRedirectNotice redirectUrl="/dashboard" applicationCount={3} />);

    const link = screen.getByRole("link", { name: /go to your dashboard/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders an absolute whitelabel URL as a plain anchor for a full navigation", () => {
    render(
      <GranteeRedirectNotice
        redirectUrl="https://grants.optimism.io/applications/REF-9"
        applicationCount={1}
      />
    );

    const link = screen.getByRole("link", { name: /view your application/i });
    expect(link).toHaveAttribute("href", "https://grants.optimism.io/applications/REF-9");
  });
});
