/**
 * @file Tests that PurchaseCreditsModal pack click triggers Stripe redirect.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ authenticated: true })),
}));

import { PurchaseCreditsModal } from "@/src/features/standalone-evaluation/components/PurchaseCreditsModal";
import { api } from "@/utilities/api/client";

const buildClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

const wrapper =
  (qc: QueryClient) =>
  ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );

describe("PurchaseCreditsModal", () => {
  let qc: QueryClient;
  let originalLocation: Location;

  beforeEach(() => {
    qc = buildClient();
    vi.clearAllMocks();
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: "" },
    });
  });

  afterEach(() => {
    qc.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("redirects to Stripe when a pack is selected", async () => {
    (api.post as vi.Mock).mockResolvedValueOnce({
      url: "https://checkout.stripe.com/x",
      sessionId: "cs_x",
    });

    const Wrapper = wrapper(qc);
    render(
      <Wrapper>
        <PurchaseCreditsModal open onOpenChange={() => {}} />
      </Wrapper>
    );

    const starterButton = await screen.findByRole("button", {
      name: /Buy Starter pack/i,
    });
    await userEvent.click(starterButton);

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    await waitFor(() => expect(window.location.href).toBe("https://checkout.stripe.com/x"));
  });
});
