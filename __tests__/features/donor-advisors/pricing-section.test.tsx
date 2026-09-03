/**
 * @file The pricing section on /donor-advisors. The numbers must come from the
 * live catalog (the same one the quota engine enforces), and the section must
 * still render its shipped defaults while that request is in flight so a
 * marketing page never shows an empty pricing block.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type React from "react";

const mockApiGet = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

interface ScrollRevealProps {
  children: React.ReactNode;
}

vi.mock("@/src/features/home/components/scroll-reveal", () => ({
  ScrollReveal: ({ children }: ScrollRevealProps) => <div>{children}</div>,
}));

import { PricingSection } from "@/src/features/donor-advisors/components/pricing-section";
import { HttpError } from "@/utilities/api/errors";

const plan = (
  p: string,
  priceCents: number | null,
  reports: number,
  intros: number,
  diligence: number,
  profiles: number,
  isPurchasable: boolean
) => ({
  plan: p,
  label: `Nonprofit Research — ${p}`,
  reportsIncluded: reports,
  introsIncluded: intros,
  diligenceIncluded: diligence,
  profilesIncluded: profiles,
  priceCents,
  isPurchasable,
});

const CATALOG = {
  freeSignupReportGrant: 2,
  billingEnabled: true,
  plans: [
    plan("free", 0, 0, 0, 0, 1, false),
    plan("starter", 2900, 10, 2, 5, 3, true),
    plan("pro", 9900, 40, 8, 20, 10, true),
    plan("firm", 39_900, 200, 30, 60, 30, true),
    plan("enterprise", null, 0, 0, 0, 0, false),
  ],
  packs: [
    {
      pack: "reports_3",
      label: "Report pack (3)",
      dimension: "reports",
      units: 3,
      priceCents: 3000,
    },
    {
      pack: "reports_10",
      label: "Report pack (10)",
      dimension: "reports",
      units: 10,
      priceCents: 8000,
    },
    { pack: "intros_5", label: "Intro pack (5)", dimension: "intros", units: 5, priceCents: 5900 },
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

  it("renders the four paid tiers including Firm and no standalone free card", async () => {
    mockApiGet.mockResolvedValue(CATALOG);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("Starter")).toBeInTheDocument());
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Firm")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
    // The free reports are a universal starting grant advertised in the header,
    // not a lesser tier, so there is no "Free" card.
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  it("shows the tier prices and the four metered dimensions", async () => {
    mockApiGet.mockResolvedValue(CATALOG);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("$29")).toBeInTheDocument());
    expect(screen.getByText("$99")).toBeInTheDocument();
    expect(screen.getByText("$399")).toBeInTheDocument();
    // Starter's four allowances.
    expect(screen.getByText("10 reports / month")).toBeInTheDocument();
    expect(screen.getByText("2 warm intros / month")).toBeInTheDocument();
    expect(screen.getByText("5 diligence rounds / month")).toBeInTheDocument();
    expect(screen.getByText("3 donor profiles")).toBeInTheDocument();
  });

  it("renders the PAYG / top-up packs", async () => {
    mockApiGet.mockResolvedValue(CATALOG);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("3 reports")).toBeInTheDocument());
    expect(screen.getByText("10 reports")).toBeInTheDocument();
    expect(screen.getByText("5 intros")).toBeInTheDocument();
  });

  it("advertises the free signup grant in the section intro", async () => {
    mockApiGet.mockResolvedValue(CATALOG);
    renderSection(qc);

    await waitFor(() =>
      expect(
        screen.getByText(/Every account starts with 2 free, full-service reports/)
      ).toBeInTheDocument()
    );
  });

  it("keeps Enterprise sales-led — custom price, contact CTA", async () => {
    mockApiGet.mockResolvedValue(CATALOG);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("Custom")).toBeInTheDocument());
    expect(screen.getByText("Custom volume for your whole team")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Talk to our team" })).toBeInTheDocument();
  });

  it("falls back to shipped prices when the catalog request fails", async () => {
    // An empty pricing block on a marketing page is worse than the shipped
    // defaults, which the live response overwrites as soon as it lands.
    mockApiGet.mockRejectedValue(
      new HttpError(500, {
        endpoint: "/v2/donor-research/billing/plans",
        method: "GET",
        body: { message: "upstream down" },
      })
    );
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("$29")).toBeInTheDocument());
    expect(screen.getByText("$99")).toBeInTheDocument();
  });

  it("routes paid plans into the product rather than straight to Stripe", async () => {
    // Checkout needs an authenticated advisor, so an anonymous visitor
    // onboards first and upgrades from the billing page.
    mockApiGet.mockResolvedValue(CATALOG);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("Starter")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Choose Starter" })).toHaveAttribute(
      "href",
      "/nonprofit-research/billing"
    );
    expect(screen.getByRole("link", { name: "Choose Pro" })).toHaveAttribute(
      "href",
      "/nonprofit-research/billing"
    );
  });

  it("keeps the featured chip on one line however narrow the card gets", async () => {
    // jsdom has no layout, so this pins the two properties that make the wrap
    // impossible rather than the rendered width: without them flex squeezed the
    // chip and "MOST POPULAR" broke into a two-line lozenge at <=343px, taller
    // than the plan name beside it (UX review, PR #2016).
    mockApiGet.mockResolvedValue(CATALOG);
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("Most popular")).toBeInTheDocument());
    const chip = screen.getByText("Most popular");
    expect(chip.className).toContain("whitespace-nowrap");
    expect(chip.className).toContain("shrink-0");
  });

  it("does not advertise a zero allowance row", async () => {
    // "0 donor profiles" is not a feature. Enterprise carries zeros across the
    // board in the catalog because its volumes are contractual.
    mockApiGet.mockResolvedValue({
      ...CATALOG,
      plans: [
        plan("free", 0, 0, 0, 0, 1, false),
        plan("starter", 2900, 10, 2, 5, 0, true),
        plan("pro", 9900, 40, 8, 20, 10, true),
        plan("firm", 39_900, 200, 30, 60, 30, true),
        plan("enterprise", null, 0, 0, 0, 0, false),
      ],
    });
    renderSection(qc);

    await waitFor(() => expect(screen.getByText("10 reports / month")).toBeInTheDocument());
    expect(screen.queryByText("0 donor profiles")).not.toBeInTheDocument();
    // The rows with a real allowance are untouched.
    expect(screen.getByText("10 donor profiles")).toBeInTheDocument();
  });

  it("uses singular copy when the grant is one report", async () => {
    mockApiGet.mockResolvedValue({ ...CATALOG, freeSignupReportGrant: 1 });
    renderSection(qc);

    await waitFor(() =>
      expect(
        screen.getByText(/Every account starts with 1 free, full-service report,/)
      ).toBeInTheDocument()
    );
  });
});
