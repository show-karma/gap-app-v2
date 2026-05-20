import { render, screen } from "@testing-library/react";
import ContactPage, { metadata } from "@/app/contact/page";

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: vi.fn().mockResolvedValue({ isWhitelabel: false }),
}));

async function renderContactPage() {
  const element = await ContactPage();
  return render(element);
}

describe("app/contact/page.tsx", () => {
  it("renders the Contact Karma H1", async () => {
    await renderContactPage();
    expect(screen.getByRole("heading", { level: 1, name: /contact karma/i })).toBeInTheDocument();
  });

  it("includes substantive body content (>500 chars)", async () => {
    const { container } = await renderContactPage();
    expect(container.textContent?.length ?? 0).toBeGreaterThan(500);
  });

  it("declares the canonical /contact path in metadata", () => {
    const canonical = (metadata.alternates?.canonical ?? "") as string;
    expect(canonical).toBe("/contact");
  });

  it("exposes the info@karmahq.xyz contact mailto link", async () => {
    await renderContactPage();
    const mailtoLinks = screen.getAllByRole("link", { name: /info@karmahq\.xyz/i });
    expect(mailtoLinks.length).toBeGreaterThanOrEqual(1);
    expect(
      mailtoLinks.some((link) => link.getAttribute("href")?.startsWith("mailto:info@karmahq.xyz"))
    ).toBe(true);
  });
});

describe("app/contact/page.tsx whitelabel gating", () => {
  it("calls notFound() when rendered on a whitelabel tenant", async () => {
    const { getWhitelabelContext } = await import("@/utilities/whitelabel-server");
    (getWhitelabelContext as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      isWhitelabel: true,
    });
    const { notFound } = await import("next/navigation");

    await ContactPage().catch(() => {
      // notFound() throws a NEXT_HTTP_ERROR_FALLBACK; swallow it here.
    });

    expect(notFound).toHaveBeenCalled();
  });
});
