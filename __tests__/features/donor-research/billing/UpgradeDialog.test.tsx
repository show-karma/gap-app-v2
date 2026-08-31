/**
 * @file Intro top-ups are subscriber-only on the indexer
 * (`DonorIntroPackRequiresSubscriptionException` → 403), so the dialog must not
 * offer an intro pack to a free/PAYG advisor. It reads the entitlement to
 * decide, and shows neither the offer nor a denial until that resolves.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type React from "react";

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

import { UpgradeDialog } from "@/src/features/donor-research/billing/UpgradeDialog";
import type { DonorEntitlement } from "@/types/donor-research-billing";
import { INDEXER } from "@/utilities/indexer";

const CATALOG = {
  freeSignupReportGrant: 2,
  billingEnabled: true,
  plans: [
    {
      plan: "starter",
      label: "Starter",
      reportsIncluded: 10,
      introsIncluded: 2,
      diligenceIncluded: 5,
      profilesIncluded: 3,
      priceCents: 2900,
      isPurchasable: true,
    },
  ],
  packs: [
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

function entitlement(overrides: Partial<DonorEntitlement> = {}): DonorEntitlement {
  return {
    advisorId: "advisor-1",
    plan: "free",
    planLabel: "Free",
    status: "free",
    reportsIncluded: 0,
    reportsUsed: 0,
    freeReportsGranted: 2,
    freeReportsUsed: 2,
    reportsRemaining: 0,
    canCreateReport: false,
    introsIncluded: 0,
    introsUsed: 0,
    introsRemaining: 0,
    canRequestIntro: false,
    diligenceIncluded: 0,
    diligenceUsed: 0,
    diligenceRemaining: 0,
    canAskDiligence: false,
    profilesIncluded: 1,
    profilesUsed: 1,
    profilesRemaining: 0,
    canCreateProfile: false,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    hasBillingAccount: false,
    billingEnabled: true,
    ...overrides,
  };
}

/** Routes the two GETs the dialog makes by path. */
function serve(ent: DonorEntitlement) {
  mockApiGet.mockImplementation((path: string) =>
    path === INDEXER.DONOR_RESEARCH.BILLING_SUBSCRIPTION
      ? Promise.resolve(ent)
      : Promise.resolve(CATALOG)
  );
}

const buildClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

function renderDialog(qc: QueryClient, dimension: "reports" | "intros") {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<UpgradeDialog dimension={dimension} onOpenChange={() => {}} open />, {
    wrapper: Wrapper,
  });
}

describe("UpgradeDialog intro top-ups", () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    qc = buildClient();
  });
  afterEach(() => qc.clear());

  it("offers the intro pack to an active subscriber", async () => {
    serve(entitlement({ plan: "starter", status: "active" }));
    renderDialog(qc, "intros");

    await waitFor(() => expect(screen.getByText("Or top up once")).toBeInTheDocument());
    expect(screen.getByText("5 warm intros")).toBeInTheDocument();
  });

  it("offers a free advisor the subscription instead of an intro pack", async () => {
    serve(entitlement({ plan: "free", status: "free" }));
    renderDialog(qc, "intros");

    await waitFor(() =>
      expect(screen.getByText(/Warm intros are a subscriber benefit/)).toBeInTheDocument()
    );
    expect(screen.queryByText("Or top up once")).not.toBeInTheDocument();
    expect(screen.queryByText("5 warm intros")).not.toBeInTheDocument();
  });

  it("withholds the intro offer from a past_due advisor, whose plan allowance is paused", async () => {
    serve(entitlement({ plan: "pro", status: "past_due" }));
    renderDialog(qc, "intros");

    await waitFor(() =>
      expect(screen.getByText(/Warm intros are a subscriber benefit/)).toBeInTheDocument()
    );
  });

  it("still offers report packs to a free advisor — reports are the PAYG path", async () => {
    serve(entitlement({ plan: "free", status: "free" }));
    renderDialog(qc, "reports");

    await waitFor(() => expect(screen.getByText("Or top up once")).toBeInTheDocument());
    expect(screen.getByText("10 reports")).toBeInTheDocument();
  });
});
