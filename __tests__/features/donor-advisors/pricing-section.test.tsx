/**
 * @file The pricing section on /donor-advisors. The numbers must come from the
 * live catalog (the same one the quota engine enforces), and the section must
 * still render its shipped defaults while that request is in flight so a
 * marketing page never shows an empty pricing block.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type React from "react";

vi.mock("@/utilities/fetchData", () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock("@/src/features/home/components/scroll-reveal", () => ({
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { PricingSection } from "@/src/features/donor-advisors/components/pricing-section";
import fetchData from "@/utilities/fetchData";

const mockFetchData = vi.mocked(fetchData);

const CATALOG = {
  freeSignupReportGrant: 2,
  billingEnabled: true,
  plans: [
    { plan: "free", label: "Free", reportsIncluded: 0, priceCents: 0, isPurchasable: false },
    {
      plan: "starter",
      label: "Nonprofit Research — Starter",
      reportsIncluded: 5,
      priceCents: 2500,
      isPurchasable: true,
    },
    {
      plan: "pro",
      label: "Nonprofit Research — Pro",
      reportsIncluded: 20,
      priceCents: 10_000,
      isPurchasable: true,
    },
    {
      plan: "enterprise",
      label: "Nonprofit Research — Enterprise",
      reportsIncluded: 0,
      priceCents: null,
      isPurchasable: false,
    },
  ],
};

const buildClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

function renderSection(qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <PricingSection />
    </QueryClientProvider>
  );
}

describe("PricingSection", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
  });
  afterEach(() => qc.clear());

  it("renders the three plans plus the free tier", async () => {
    mockFetchData.mockResolvedValue([CATALOG, null, null, 200]);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("Starter")).toBeInTheDocument());
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("shows $25 for 5 reports and $100 for 20", async () => {
    mockFetchData.mockResolvedValue([CATALOG, null, null, 200]);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("$25")).toBeInTheDocument());
    expect(screen.getByText("5 reports per month")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
    expect(screen.getByText("20 reports per month")).toBeInTheDocument();
  });

  it("advertises the free signup grant", async () => {
    mockFetchData.mockResolvedValue([CATALOG, null, null, 200]);
    renderSection(qc);

    // Once on the Free card, once in the section intro.
    await waitFor(() => expect(screen.getByText("2 free reports to start")).toBeInTheDocument());
    expect(screen.getByText(/Every account starts with 2 free reports/)).toBeInTheDocument();
  });

  it("keeps Enterprise sales-led — custom price, contact CTA", async () => {
    mockFetchData.mockResolvedValue([CATALOG, null, null, 200]);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("Custom")).toBeInTheDocument());
    expect(screen.getByText("Volume allowance for your whole team")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Talk to our team" })).toBeInTheDocument();
  });

  it("falls back to shipped prices when the catalog request fails", async () => {
    // An empty pricing block on a marketing page is worse than the shipped
    // defaults, which the live response overwrites as soon as it lands.
    mockFetchData.mockResolvedValue([null, "upstream down", null, 500]);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("$25")).toBeInTheDocument());
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("routes paid plans into the product rather than straight to Stripe", async () => {
    // Checkout needs an authenticated advisor, so an anonymous visitor
    // onboards first and upgrades from the billing page.
    mockFetchData.mockResolvedValue([CATALOG, null, null, 200]);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("Starter")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Choose Starter" })).toHaveAttribute(
      "href",
      "/nonprofit-research/billing"
    );
    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute(
      "href",
      "/nonprofit-research"
    );
  });

  it("uses singular copy when the grant is one report", async () => {
    mockFetchData.mockResolvedValue([{ ...CATALOG, freeSignupReportGrant: 1 }, null, null, 200]);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("1 free report to start")).toBeInTheDocument());
  });
});
